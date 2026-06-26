import { getSupabase, isSupabaseConfigured } from "./supabase";
import { SEED_POSTS } from "./data";
import type { CreateResult, NewPost, Post } from "./types";

const TABLE = "posts";

/** Columnas públicas (nunca incluir manage_token). */
const PUBLIC_COLUMNS =
  "id,type,category,title,description,city,zone,contact_name,contact_phone,people_count,lat,lng,status,created_at,address,trapped,rescue_state,rescued_at";

/** Registro interno en memoria: una publicación + su token de gestión. */
type MemPost = Post & { manage_token: string };

/**
 * Almacén en memoria para "modo demo" (sin Supabase). Persiste mientras viva
 * el proceso de Node. NO usar como almacenamiento real en producción.
 */
const globalForMem = globalThis as unknown as { __ayudaPosts?: MemPost[] };
if (!globalForMem.__ayudaPosts) {
  globalForMem.__ayudaPosts = SEED_POSTS.map((p) => ({
    ...p,
    manage_token: crypto.randomUUID(),
  }));
}
const memoryPosts = globalForMem.__ayudaPosts;

function strip(p: MemPost): Post {
  const { manage_token: _t, ...rest } = p;
  return rest;
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export interface ListFilter {
  type?: Post["type"];
  city?: string;
  category?: string;
}

export async function listPosts(filter: ListFilter = {}): Promise<Post[]> {
  const supabase = getSupabase();

  if (!supabase) {
    return memoryPosts
      .filter((p) => p.status === "active")
      .filter((p) => (filter.type ? p.type === filter.type : true))
      .filter((p) => (filter.city ? p.city === filter.city : true))
      .filter((p) => (filter.category ? p.category === filter.category : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(strip);
  }

  let query = supabase
    .from(TABLE)
    .select(PUBLIC_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filter.type) query = query.eq("type", filter.type);
  if (filter.city) query = query.eq("city", filter.city);
  if (filter.category) query = query.eq("category", filter.category);

  const { data, error } = await query;
  if (error) {
    console.error("[db] listPosts error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as Post[];
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = getSupabase();
  if (!supabase) {
    const p = memoryPosts.find((x) => x.id === id);
    return p ? strip(p) : null;
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[db] getPostById error:", error.message);
    return null;
  }
  return (data as unknown as Post) ?? null;
}

export async function createPost(input: NewPost): Promise<CreateResult> {
  const supabase = getSupabase();

  const base = {
    type: input.type,
    category: input.category,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    city: input.city,
    zone: input.zone?.trim() || null,
    contact_name: input.contact_name.trim(),
    contact_phone: input.contact_phone.trim(),
    people_count: input.people_count ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    address: input.address?.trim() || null,
    trapped: input.trapped ?? false,
    rescue_state: null,
    rescued_at: null,
  };

  if (!supabase) {
    const record: MemPost = {
      id: crypto.randomUUID(),
      ...base,
      status: "active",
      created_at: new Date().toISOString(),
      manage_token: crypto.randomUUID(),
    };
    memoryPosts.unshift(record);
    return { post: strip(record), manageToken: record.manage_token };
  }

  // Vía preferida: RPC que genera y devuelve el token de gestión.
  const { data: rpcData, error: rpcError } = await supabase.rpc("create_post", {
    p_type: base.type,
    p_category: base.category,
    p_title: base.title,
    p_description: base.description ?? "",
    p_city: base.city,
    p_zone: base.zone ?? "",
    p_contact_name: base.contact_name,
    p_contact_phone: base.contact_phone,
    p_people_count: base.people_count,
    p_lat: base.lat,
    p_lng: base.lng,
    p_address: base.address ?? "",
    p_trapped: base.trapped,
  });

  if (!rpcError && rpcData && rpcData[0]) {
    const row = rpcData[0] as { id: string; manage_token: string };
    return {
      post: { id: row.id, ...base, status: "active", created_at: new Date().toISOString() },
      manageToken: row.manage_token,
    };
  }

  // Respaldo: si la migración aún no está aplicada, insertar directo (sin token).
  const { data, error } = await supabase
    .from(TABLE)
    .insert(base)
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error("[db] createPost error:", error.message);
    throw new Error("No se pudo publicar. Intenta de nuevo.");
  }
  return { post: data as unknown as Post, manageToken: null };
}

export async function resolvePost(id: string, token: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const p = memoryPosts.find((x) => x.id === id && x.manage_token === token);
    if (!p) return false;
    p.status = "resolved";
    return true;
  }
  const { data, error } = await supabase.rpc("resolve_post", {
    p_id: id,
    p_token: token,
  });
  if (error) {
    console.error("[db] resolvePost error:", error.message);
    return false;
  }
  return Boolean(data);
}

/** Marca el progreso de un rescate (en_camino / rescatados / null). Sin token: cualquiera puede actualizarlo. */
export async function setRescueState(
  id: string,
  state: "en_camino" | "rescatados" | null,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const p = memoryPosts.find((x) => x.id === id);
    if (!p) return false;
    p.rescue_state = state;
    p.rescued_at = state === "rescatados" ? new Date().toISOString() : null;
    return true;
  }
  const { data, error } = await supabase.rpc("set_rescue_state", {
    p_id: id,
    p_state: state,
  });
  if (error) {
    console.error("[db] setRescueState error:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function deletePost(id: string, token: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    const i = memoryPosts.findIndex((x) => x.id === id && x.manage_token === token);
    if (i === -1) return false;
    memoryPosts.splice(i, 1);
    return true;
  }
  const { data, error } = await supabase.rpc("delete_post", {
    p_id: id,
    p_token: token,
  });
  if (error) {
    console.error("[db] deletePost error:", error.message);
    return false;
  }
  return Boolean(data);
}
