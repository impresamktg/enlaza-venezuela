/**
 * Directorio de SITIOS de Venezuela Reporta: centros de acopio, refugios,
 * clínicas y hospitales reportados por la comunidad en terreno. Solo lectura.
 * Mapea al modelo Sitio de Enlaza. Cachea 5 min (Data Cache de Next). Nunca lanza.
 *
 * No trae datos personales: solo lugares físicos y su estado operativo, así que
 * no aplica ninguna guarda de PII. La fuente repite el mismo sitio con ids
 * distintos, por eso deduplicamos por nombre + coordenadas.
 *
 * Atribución obligatoria de la fuente: "Venezuela Reporta".
 */
const VR_SITIOS = "https://venezuelareporta.org/api/v1/sitios";
const REVALIDATE = 300;

export const SITIOS_SOURCE = "Venezuela Reporta";
export const SITIOS_SOURCE_URL = "https://venezuelareporta.org";

export type SitioType = "acopio" | "refugio" | "clinica" | "hospital" | "otro";

export type Sitio = {
  id: string;
  type: SitioType;
  name: string;
  /** estado_operativo de la fuente (abierto/cerrado/saturado…), o null. */
  status: string | null;
  municipio: string | null;
  coords: { lat: number; lng: number } | null;
  /** Insumos que el sitio necesita (sobre todo en acopios). */
  needs: string[];
  note: string | null;
  reports: number | null;
  /** ISO del último reporte, o null. */
  updatedAt: string | null;
  /** "reciente" | "desactualizado" | … tal cual lo da la fuente. */
  freshness: string | null;
};

/** Etiquetas, icono, color (marcador del mapa) y orden por tipo. Compartido por
 *  la tarjeta, el mapa y la leyenda. */
export const SITIO_META: Record<
  SitioType,
  { label: string; plural: string; icon: string; color: string }
> = {
  acopio: { label: "Centro de acopio", plural: "Centros de acopio", icon: "📦", color: "#2563eb" },
  refugio: { label: "Refugio", plural: "Refugios", icon: "🏠", color: "#059669" },
  clinica: { label: "Clínica", plural: "Clínicas", icon: "🩺", color: "#db2777" },
  hospital: { label: "Hospital", plural: "Hospitales", icon: "🏥", color: "#dc2626" },
  otro: { label: "Otro sitio", plural: "Otros sitios", icon: "📍", color: "#78716c" },
};
export const SITIO_ORDER: SitioType[] = ["acopio", "refugio", "clinica", "hospital", "otro"];

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const orNull = (v: unknown): string | null => {
  const s = str(v).trim();
  return s ? s : null;
};
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const TYPES: Record<string, SitioType> = {
  acopio: "acopio",
  refugio: "refugio",
  albergue: "refugio",
  clinica: "clinica",
  "clínica": "clinica",
  hospital: "hospital",
};
const toType = (v: unknown): SitioType => TYPES[str(v).toLowerCase().trim()] ?? "otro";

function toSitio(r: Row): Sitio {
  const lat = num(r.lat);
  const lng = num(r.lng);
  const needs = Array.isArray(r.necesidades)
    ? r.necesidades.map(str).map((s) => s.trim()).filter(Boolean)
    : [];
  return {
    id: `vr-sitio-${str(r.id)}`,
    type: toType(r.tipo),
    name: str(r.nombre).trim() || "Sitio sin nombre",
    status: orNull(r.estado_operativo),
    municipio: orNull(r.municipio),
    coords: lat !== null && lng !== null ? { lat, lng } : null,
    needs,
    note: orNull(r.nota),
    reports: num(r.reportes),
    updatedAt: orNull(r.ultimo_reporte_at),
    freshness: orNull(r.frescura),
  };
}

/** La fuente repite el mismo lugar con ids distintos: colapsa por nombre+coords,
 *  conserva el reporte más reciente y acumula el conteo de reportes. */
function dedup(items: Sitio[]): Sitio[] {
  const byKey = new Map<string, Sitio>();
  for (const s of items) {
    const key = s.coords
      ? `${s.name.toLowerCase()}@${s.coords.lat.toFixed(4)},${s.coords.lng.toFixed(4)}`
      : `${s.name.toLowerCase()}@${s.id}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, s);
    } else {
      const keep = (s.updatedAt ?? "") > (prev.updatedAt ?? "") ? s : prev;
      keep.reports = ((prev.reports ?? 0) + (s.reports ?? 0)) || keep.reports;
      byKey.set(key, keep);
    }
  }
  return [...byKey.values()];
}

/** Lista todos los sitios, deduplicados y ordenados por reporte más reciente. */
export async function listSitios(): Promise<Sitio[]> {
  try {
    const res = await fetch(`${VR_SITIOS}?limit=5000`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return [];
    const j = (await res.json()) as { sitios?: Row[] };
    const rows = Array.isArray(j.sitios) ? j.sitios : [];
    return dedup(rows.map(toSitio)).sort((a, b) =>
      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
    );
  } catch {
    return [];
  }
}
