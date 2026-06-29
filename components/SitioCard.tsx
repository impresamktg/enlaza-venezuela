import { mapsSearchHref, timeAgo } from "@/lib/format";
import { SITIO_META, type Sitio } from "@/lib/sitios";

/** Estado operativo conocido → etiqueta + color. Lo desconocido se muestra crudo. */
const STATUS: Record<string, { label: string; color: string; soft: string }> = {
  abierto: { label: "Abierto", color: "var(--color-offer)", soft: "var(--color-offer-soft)" },
  operativo: { label: "Operativo", color: "var(--color-offer)", soft: "var(--color-offer-soft)" },
  saturado: { label: "Saturado", color: "var(--color-ink)", soft: "var(--color-ve-yellow)" },
  lleno: { label: "Lleno", color: "var(--color-ink)", soft: "var(--color-ve-yellow)" },
  cerrado: { label: "Cerrado", color: "var(--color-need)", soft: "var(--color-need-soft)" },
};

/** Tarjeta de un sitio de ayuda (acopio/refugio/clínica/hospital). Sin datos
 *  personales: solo lugar, estado y, en acopios, insumos que necesita. */
export default function SitioCard({ sitio: s }: { sitio: Sitio }) {
  const meta = SITIO_META[s.type];
  const st = STATUS[(s.status ?? "").toLowerCase()];
  const accent = st?.color ?? "var(--color-ve-blue)";
  const mapsHref = s.coords ? mapsSearchHref([`${s.coords.lat},${s.coords.lng}`]) : null;
  const stale = s.freshness === "desactualizado";

  return (
    <article className="fade-in relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-semibold leading-snug">
          <span className="mr-1" aria-hidden>
            {meta.icon}
          </span>
          {s.name}
        </h3>
        {st ? (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: st.soft, color: st.color }}
          >
            {st.label}
          </span>
        ) : s.status ? (
          <span className="shrink-0 rounded-full bg-[var(--color-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted)]">
            {s.status}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--color-muted)]">
        <span>{meta.label}</span>
        {s.municipio && <span>· 📍 {s.municipio}</span>}
      </div>

      {s.needs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-[var(--color-muted)]">Necesita:</span>
          {s.needs.slice(0, 8).map((n) => (
            <span
              key={n}
              className="rounded-md bg-[var(--color-need-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-need)]"
            >
              {n}
            </span>
          ))}
        </div>
      )}

      {s.note && <p className="line-clamp-2 text-sm text-[var(--color-ink)]/80">{s.note}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-[var(--color-muted)]">
        {s.updatedAt && <span title={s.updatedAt}>Reporte {timeAgo(s.updatedAt)}</span>}
        {stale && (
          <span
            className="rounded-md px-1.5 py-0.5 font-semibold"
            style={{ background: "var(--color-ve-yellow)", color: "var(--color-ink)" }}
          >
            Desactualizado
          </span>
        )}
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--color-ve-blue)] hover:underline"
          >
            Cómo llegar
          </a>
        )}
      </div>
    </article>
  );
}
