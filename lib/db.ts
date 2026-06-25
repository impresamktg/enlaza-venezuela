import { getSupabase, isSupabaseConfigured } from "./supabase";
import { SEED_POSTS } from "./data";
import type { NewPost, Post } from "./types";

const TABLE = "posts";

/**
 * Almacén en memoria para "modo demo" (sin Supabase). Persiste mientras viva
 * el proceso de Node. Útil en desarrollo y para probar la plataforma sin
 * configurar una base de datos. NO usar como almacenamiento real en producción.
 */
const globalForMem = globalThis as unknown as { __ayudaPosts?: Post[] };
if (!globalForMem.__ayudaPosts) {
  globalForMem.__ayudaPosts = [...SEED_POSTS];
}
const memoryPosts = globalForMem.__ayudaPosts;

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
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  let query = supabase
    .from(TABLE)
    .select("*")
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
  return (data ?? []) as Post[];
}

export async function createPost(input: NewPost): Promise<Post> {
  const supabase = getSupabase();

  const record: Post = {
    id: crypto.randomUUID(),
    type: input.type,
    category: input.category,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    city: input.city,
    zone: input.zone?.trim() || null,
    contact_name: input.contact_name.trim(),
    contact_phone: input.contact_phone.trim(),
    people_count: input.people_count ?? null,
    status: "active",
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    memoryPosts.unshift(record);
    return record;
  }

  // Dejamos que la base de datos genere id y created_at.
  const { id: _id, created_at: _createdAt, ...insertable } = record;
  const { data, error } = await supabase
    .from(TABLE)
    .insert(insertable)
    .select("*")
    .single();

  if (error) {
    console.error("[db] createPost error:", error.message);
    throw new Error("No se pudo publicar. Intenta de nuevo.");
  }
  return data as Post;
}

export async function countByType(): Promise<{ need: number; offer: number }> {
  const posts = await listPosts();
  return {
    need: posts.filter((p) => p.type === "need").length,
    offer: posts.filter((p) => p.type === "offer").length,
  };
}
