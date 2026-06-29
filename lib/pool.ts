import type { Post } from "./types";

/**
 * Consumo del pool común IA911 (tuia911.com): trae necesidades, recursos y
 * voluntarios de TODAS las apps y los mapea al modelo Post de Enlaza para
 * mostrarlos en el mismo tablón/directorio. Solo lectura. Cachea 60s (Data Cache
 * de Next) para no golpear el límite de peticiones del pool. Nunca lanza.
 *
 * Dedupe: excluye lo que la propia Enlaza ya empujó (fuente "ext:enlaza").
 * Solo incluye registros con teléfono (para que el botón de WhatsApp funcione).
 */
const BASE = "https://gkpivfmnclcahppkrfzl.supabase.co/functions/v1/api";
const REVALIDATE = 60;

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const BAD_LOC = new Set([
  "none", "null", "por confirmar", "n/a", "na", "sin especificar", "desconocido", "-",
]);
/** Limpia un texto de ubicación: descarta vacíos/placeholders y el prefijo "Estado". */
function cleanLoc(v: unknown): string | null {
  const s = str(v).trim();
  if (!s || BAD_LOC.has(s.toLowerCase())) return null;
  return s.replace(/^estado\s+/i, "").trim();
}

/** Etiqueta legible "Municipio, Estado" (sin repetir) a partir del pool. */
function placeLabel(municipio: unknown, estado: unknown): string | null {
  const m = cleanLoc(municipio);
  const e = cleanLoc(estado);
  if (m && e) {
    const ml = m.toLowerCase();
    const el = e.toLowerCase();
    return ml === el || ml.includes(el) || el.includes(ml) ? m : `${m}, ${e}`;
  }
  return m || e;
}

// Palabras clave (estado/municipio) → id de ciudad de Enlaza. Solo las
// inequívocas; el resto queda "otra" pero conserva su etiqueta real (zone).
const CITY_KEYWORDS: [string, string][] = [
  ["distrito capital", "caracas"], ["caracas", "caracas"], ["chacao", "caracas"],
  ["baruta", "caracas"], ["el hatillo", "caracas"],
  ["guaira", "la-guaira"], ["vargas", "la-guaira"], ["maiquet", "la-guaira"],
  ["caraballeda", "la-guaira"], ["catia la mar", "la-guaira"],
  ["yaracuy", "san-felipe"], ["san felipe", "san-felipe"],
  ["puerto cabello", "moron"], ["morón", "moron"], ["moron", "moron"],
  ["carabobo", "valencia"], ["valencia", "valencia"],
  ["aragua", "maracay"], ["maracay", "maracay"],
  ["zulia", "maracaibo"], ["maracaibo", "maracaibo"],
  ["lara", "barquisimeto"], ["barquisimeto", "barquisimeto"],
];
/** Mejor esfuerzo: deduce la ciudad de Enlaza desde estado/municipio/referencia. */
function toCity(estado: unknown, municipio?: unknown, referencia?: unknown): string {
  const s = `${str(estado)} ${str(municipio)} ${str(referencia)}`.toLowerCase();
  for (const [needle, id] of CITY_KEYWORDS) if (s.includes(needle)) return id;
  return "otra";
}

const CAT: Record<string, string> = {
  rescate: "rescate", maquinaria: "maquinaria", medicina: "salud", salud: "salud",
  alimento: "alimentos", alimentos: "alimentos", agua: "alimentos", comida: "alimentos",
  refugio: "refugio", albergue: "refugio", acopio: "refugio", transporte: "transporte",
  voluntarios: "voluntarios", voluntario: "voluntarios", materiales: "materiales",
  herramientas: "materiales", comunicacion: "comunicacion", energia: "comunicacion",
  mascotas: "mascotas", mascota: "mascotas",
};
const toCategory = (c: unknown): string => CAT[str(c).toLowerCase().trim()] ?? "otros";

function phone(...cands: unknown[]): string | null {
  for (const c of cands) {
    const s = str(c).trim();
    if (s.replace(/\D/g, "").length >= 7) return s;
  }
  return null;
}
function firstUrl(text: unknown): string | null {
  const m = str(text).match(/https?:\/\/\S+/);
  return m ? m[0].replace(/[.,)]+$/, "") : null;
}
function clip(s: unknown, n: number): string {
  const t = str(s).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

/** Rellena un Post con valores por defecto + los campos del registro del pool. */
function toPost(p: Partial<Post>): Post {
  return {
    id: "", type: "need", category: "otros", title: "", description: null,
    city: "otra", zone: null, contact_name: "Reporte en la red", contact_phone: "",
    people_count: null, lat: null, lng: null, status: "active",
    created_at: new Date().toISOString(), address: null, trapped: false,
    rescue_state: null, rescued_at: null, duplicate_of: null,
    corroboration_count: 0, photos: [], source: "IA911", source_url: null,
    ...p,
  };
}

const notOurs = (r: Row): boolean => !str(r.fuente).toLowerCase().startsWith("ext:enlaza");

async function getRows(path: string): Promise<Row[]> {
  try {
    const res = await fetch(`${BASE}/${path}`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return [];
    const j = (await res.json()) as { data?: Row[] };
    return Array.isArray(j.data) ? j.data.filter(notOurs) : [];
  } catch {
    return [];
  }
}

export async function listPoolNeeds(): Promise<Post[]> {
  const rows = await getRows("necesidades?limit=500");
  return rows.flatMap((r) => {
    const tel = phone(r.contacto_tel, r.contacto);
    if (!tel) return [];
    const desc = str(r.descripcion);
    return [toPost({
      id: `ia911-nec-${str(r.id)}`,
      type: "need",
      category: toCategory(r.categoria),
      title: clip(str(r.referencia) || desc || str(r.categoria) || "Necesidad", 70),
      description: desc || null,
      city: toCity(r.estado_geo, r.municipio, r.referencia),
      zone: placeLabel(r.municipio, r.estado_geo),
      contact_phone: tel,
      people_count: num(r.num_personas),
      created_at: str(r.created_at) || new Date().toISOString(),
      address: str(r.referencia) || null,
      source_url: firstUrl(desc),
    })];
  });
}

export async function listPoolOffers(): Promise<Post[]> {
  const rows = await getRows("recursos?limit=500");
  return rows.flatMap((r) => {
    const tel = phone(r.contacto);
    if (!tel) return [];
    return [toPost({
      id: `ia911-rec-${str(r.id)}`,
      type: "offer",
      category: toCategory(r.categoria),
      title: clip(str(r.nombre) || str(r.categoria) || "Oferta", 70),
      description: str(r.descripcion) || null,
      city: toCity(r.estado_geo, r.municipio),
      zone: placeLabel(r.municipio, r.estado_geo),
      contact_phone: tel,
      contact_name: str(r.nombre) ? clip(r.nombre, 40) : "Oferta en la red",
      lat: num(r.lat),
      lng: num(r.lng),
      created_at: str(r.created_at) || new Date().toISOString(),
      source_url: str(r.url) || firstUrl(r.descripcion),
    })];
  });
}

export async function listPoolProviders(): Promise<Post[]> {
  const rows = await getRows("voluntarios?limit=500");
  return rows.flatMap((r) => {
    const tel = phone(r.telefono);
    if (!tel) return [];
    const oficios = Array.isArray(r.oficios) ? r.oficios.map(str).join(", ") : "";
    const disp = str(r.disponibilidad);
    return [toPost({
      id: `ia911-vol-${str(r.id)}`,
      type: "offer",
      category: "voluntarios",
      title: clip([oficios, str(r.nombre)].filter(Boolean).join(" — ") || "Voluntario", 70),
      description: [str(r.descripcion), disp && `Disponible: ${disp}`].filter(Boolean).join(" · ") || null,
      city: toCity(r.estado_geo, r.municipio),
      zone: placeLabel(r.municipio, r.estado_geo),
      contact_phone: tel,
      contact_name: str(r.nombre) ? clip(r.nombre, 40) : "Voluntario",
      created_at: str(r.created_at) || new Date().toISOString(),
    })];
  });
}

/** Necesidades + ofertas del pool (para el tablón principal). */
export async function listPool(): Promise<Post[]> {
  const [needs, offers] = await Promise.all([listPoolNeeds(), listPoolOffers()]);
  return [...needs, ...offers];
}

/**
 * Busca un registro del pool por su id sintético (ia911-…) para la página de
 * detalle. Reaprovecha la caché de 60s de las listas; nunca lanza.
 */
export async function getPoolPostById(id: string): Promise<Post | null> {
  if (!id.startsWith("ia911-")) return null;
  const [pool, providers] = await Promise.all([listPool(), listPoolProviders()]);
  return [...pool, ...providers].find((p) => p.id === id) ?? null;
}
