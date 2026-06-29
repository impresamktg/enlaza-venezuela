import { mapsSearchHref } from "@/lib/format";
import type { MissingPerson } from "@/lib/desaparecidos";

/** Tarjeta de persona desaparecida/encontrada. Aplica en UI las guardas de
 *  menores que vienen ya resueltas en el modelo (edad/ubicación ocultas). */
export default function MissingPersonCard({ person: p }: { person: MissingPerson }) {
  const found = p.status === "encontrada";
  const accent = found ? "var(--color-offer)" : "var(--color-need)";
  const softBg = found ? "var(--color-offer-soft)" : "var(--color-need-soft)";
  const statusLabel = found
    ? "Encontrada"
    : p.status === "desaparecida"
      ? "Desaparecida"
      : "Reporte";

  const place = [p.municipio, p.estado].filter(Boolean).join(" · ");
  const mapsHref = p.coords
    ? mapsSearchHref([place || null, "Venezuela"])
    : null;

  return (
    <article className="fade-in relative flex gap-3 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
        aria-hidden
      />

      {p.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photoUrl}
          alt={p.name}
          width={72}
          height={72}
          className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg)] text-2xl">
          🧑
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-semibold leading-snug">
            {p.name}
            {p.alias && (
              <span className="font-normal text-[var(--color-muted)]"> “{p.alias}”</span>
            )}
          </h3>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: softBg, color: accent }}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--color-muted)]">
          {p.age !== null && <span>{p.age} años</span>}
          {p.gender && <span>· {p.gender}</span>}
          {place && <span>· 📍 {place}</span>}
          {p.isMinor && (
            <span
              className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
              style={{ background: "var(--color-ve-yellow)", color: "var(--color-ink)" }}
            >
              Menor protegido
            </span>
          )}
        </div>

        {(p.marks || p.description) && (
          <p className="line-clamp-2 text-sm text-[var(--color-ink)]/80">
            {p.marks || p.description}
          </p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
          {typeof p.reports === "number" && p.reports > 0 && (
            <span>{p.reports} reporte{p.reports === 1 ? "" : "s"}</span>
          )}
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--color-ve-blue)] hover:underline"
            >
              Ver zona en el mapa
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
