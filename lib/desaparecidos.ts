/**
 * Búsqueda de personas desaparecidas/encontradas contra las fuentes comunes.
 *
 * - Personas: API central IA911 (RPC buscar_personas). Es la fuente única de
 *   personas; busca por nombre/apodo/ubicación (NO indexa cédula).
 * - Listas/lugares relacionados: incidentes públicos de avisave (rosters de
 *   centros/hospitales). Su API pública solo expone resúmenes de incidente, no
 *   personas ni cédulas.
 *
 * Guardas de menores (directriz de la red): si edad < 18 ocultamos la edad y la
 * ubicación exacta, y depuramos cualquier cédula del texto. Nunca lanza.
 */

// Proyecto Supabase de IA911 (mismo del pool). La anon key es pública por diseño.
const IA911_RPC =
  "https://gkpivfmnclcahppkrfzl.supabase.co/rest/v1/rpc/buscar_personas";
const IA911_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcGl2Zm1uY2xjYWhwcGtyZnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTQ3NjcsImV4cCI6MjA5Nzk3MDc2N30.afoJkAd4CK5hVFiU3RJ1kVpnxthElDGE-8c-DKVzul0";
const AVISAVE_INCIDENTS = "https://api.avisave.com/api/public/incidents";

export type MissingStatus = "desaparecida" | "encontrada" | "otro";

export type MissingPerson = {
  id: string;
  status: MissingStatus;
  name: string;
  alias: string | null;
  /** Ya con guarda de menores aplicada: null si es menor o si no se conoce. */
  age: number | null;
  isMinor: boolean;
  gender: string | null;
  estado: string | null;
  municipio: string | null;
  /** null para menores (ubicación exacta oculta). */
  coords: { lat: number; lng: number } | null;
  photoUrl: string | null;
  /** Señas + descripción, depuradas de cédulas. */
  marks: string | null;
  description: string | null;
  reports: number | null;
};

export type RelatedIncident = {
  id: string;
  title: string;
  summary: string | null;
  place: string | null;
  url: string | null;
};

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const orNull = (v: unknown): string | null => {
  const s = str(v).trim();
  return s ? s : null;
};
const intOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;

/** Quita números tipo cédula (6–8 dígitos, con o sin V-/E-) del texto mostrado. */
function stripCedulas(text: string): string {
  return text.replace(/\b[VvEe]?[-.]?\d{6,8}\b/g, "•••").replace(/\s{2,}/g, " ").trim();
}

function normalizeStatus(tipo: unknown): MissingStatus {
  const t = str(tipo).toLowerCase();
  if (t.includes("encontrad")) return "encontrada";
  if (t.includes("desaparecid")) return "desaparecida";
  return "otro";
}

function toMissingPerson(r: Row): MissingPerson {
  const age = intOrNull(r.edad);
  const isMinor = age !== null && age < 18;
  const lat = typeof r.lat === "number" ? r.lat : null;
  const lng = typeof r.lng === "number" ? r.lng : null;
  const desc = orNull(r.descripcion);
  const senas = orNull(r.senas);
  return {
    id: `ia911-per-${str(r.id)}`,
    status: normalizeStatus(r.tipo),
    name: str(r.nombre) || "Sin nombre",
    alias: orNull(r.apodo),
    age: isMinor ? null : age,
    isMinor,
    gender: orNull(r.genero),
    estado: orNull(r.estado_geo),
    municipio: orNull(r.municipio),
    // Guarda de menores: nunca exponemos la ubicación exacta de un menor.
    coords: !isMinor && lat !== null && lng !== null ? { lat, lng } : null,
    photoUrl: orNull(r.foto_url),
    marks: senas ? stripCedulas(senas) : null,
    description: desc ? stripCedulas(desc) : null,
    reports: intOrNull(r.reportes),
  };
}

/** Busca personas en IA911 por texto libre (nombre/apodo) y opcional estado. */
export async function searchMissingPersons(
  query: string,
  estado?: string,
): Promise<MissingPerson[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(IA911_RPC, {
      method: "POST",
      headers: {
        apikey: IA911_ANON,
        Authorization: `Bearer ${IA911_ANON}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_lat: null,
        p_lng: null,
        p_radio_km: null,
        p_tipo: null,
        p_q: q,
        p_estado_geo: estado?.trim() || null,
        p_municipio: null,
      }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Row[];
    return Array.isArray(data) ? data.map(toMissingPerson) : [];
  } catch {
    return [];
  }
}

/** Incidentes públicos de avisave que coinciden con el texto (listas/lugares). */
export async function searchRelatedIncidents(
  query: string,
  limit = 6,
): Promise<RelatedIncident[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `${AVISAVE_INCIDENTS}?search=${encodeURIComponent(q)}&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const j = (await res.json()) as { data?: Row[] };
    const rows = Array.isArray(j.data) ? j.data : [];
    return rows.map((r) => {
      const loc = (r.location ?? {}) as Row;
      const place =
        orNull(loc.label) ||
        [orNull(loc.locality), orNull(loc.region)].filter(Boolean).join(", ") ||
        null;
      return {
        id: `avisave-${str(r.id)}`,
        title: str(r.title) || str(r.summary).slice(0, 80) || "Incidente",
        summary: orNull(r.summary),
        place,
        url: orNull(r.url),
      };
    });
  } catch {
    return [];
  }
}
