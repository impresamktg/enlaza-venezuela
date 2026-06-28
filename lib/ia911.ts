import type { Post } from "./types";
import { cityName } from "./data";

/**
 * Integración con el pool común IA911 (tuia911.com). Acuerdo de coordinación
 * 2026-06-28: toda data nueva se reinserta en la API común. Abierta (sin clave),
 * idempotente por el par (fuente, id) — reenviar la misma publicación actualiza,
 * no duplica. Docs: https://tuia911.com/api.html
 *
 * Mapeo: need → /necesidades, offer → /recursos. (Las solicitudes con personas
 * atrapadas son necesidades en un lugar, no personas con nombre, así que NO van a
 * /personas.)
 */
const IA911_BASE =
  "https://gkpivfmnclcahppkrfzl.supabase.co/functions/v1/api";
const FUENTE = "enlaza";

/** Ciudad de Enlaza → estado_geo de IA911 (texto libre). */
const CITY_ESTADO: Record<string, string> = {
  caracas: "Distrito Capital",
  "la-guaira": "La Guaira",
  "san-felipe": "Yaracuy",
  moron: "Carabobo",
  valencia: "Carabobo",
  maracay: "Aragua",
  maracaibo: "Zulia",
  barquisimeto: "Lara",
};

/** Categoría de Enlaza → categoría de IA911 (texto libre; el resto pasa igual). */
const CATEGORY_ALIAS: Record<string, string> = {
  salud: "medicina",
  alimentos: "alimento",
};

function estadoGeo(post: Pick<Post, "city">): string | null {
  if (post.city === "otra") return null;
  return CITY_ESTADO[post.city] ?? cityName(post.city);
}

function categoria(post: Pick<Post, "category">): string {
  return CATEGORY_ALIAS[post.category] ?? post.category;
}

/** Cuerpo IA911 para una publicación de Enlaza (need→necesidades, offer→recursos). */
export function ia911Body(post: Post): { endpoint: "necesidades" | "recursos"; body: Record<string, unknown> } {
  const descripcion = [post.title, post.description].filter(Boolean).join(" — ");
  if (post.type === "need") {
    return {
      endpoint: "necesidades",
      body: {
        fuente: FUENTE,
        id: post.id,
        categoria: categoria(post),
        // IA911 urgencia ∈ {media, alta, critica}. "normal" no es válido.
        urgencia: post.trapped
          ? "critica"
          : post.category === "rescate" || post.category === "maquinaria"
            ? "alta"
            : "media",
        descripcion,
        contacto: post.contact_phone,
        num_personas: post.people_count ?? null,
        estado_geo: estadoGeo(post),
        municipio: post.zone ?? null,
        referencia: post.address ?? null,
      },
    };
  }
  return {
    endpoint: "recursos",
    body: {
      fuente: FUENTE,
      id: post.id,
      nombre: post.title,
      categoria: categoria(post),
      descripcion: post.description ?? post.title,
      contacto: post.contact_phone,
      lat: post.lat,
      lng: post.lng,
      estado_geo: estadoGeo(post),
      municipio: post.zone ?? null,
    },
  };
}

/**
 * Reinserta una publicación en el pool común IA911. Nunca lanza: registra el
 * error y sigue (la publicación en Enlaza ya se creó). Con timeout para no
 * bloquear el publicar si IA911 tarda.
 */
export async function pushToPool(
  post: Post,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const { endpoint, body } = ia911Body(post);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${IA911_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[ia911] push ${endpoint} ${res.status}: ${txt.slice(0, 200)}`);
      return { ok: false, status: res.status, error: txt.slice(0, 200) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    console.error(`[ia911] push ${endpoint} error:`, (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}
