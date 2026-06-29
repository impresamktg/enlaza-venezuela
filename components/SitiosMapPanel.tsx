"use client";

import dynamic from "next/dynamic";
import { SITIO_META, SITIO_ORDER, type Sitio } from "@/lib/sitios";

// Leaflet necesita window: se carga solo en cliente (sin SSR), igual que el
// mapa del tablón (components/Board.tsx).
const SitiosMap = dynamic(() => import("./SitiosMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[480px] w-full items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-muted)]">
      Cargando mapa…
    </div>
  ),
});

/** Mapa de sitios + leyenda de colores por tipo. No renderiza nada si ningún
 *  sitio tiene coordenadas. Refleja el filtro activo de la página. */
export default function SitiosMapPanel({ sitios }: { sitios: Sitio[] }) {
  const withCoords = sitios.filter((s) => s.coords);
  if (withCoords.length === 0) return null;

  const typesPresent = SITIO_ORDER.filter((t) => withCoords.some((s) => s.type === t));

  return (
    <div className="mt-6">
      <SitiosMap sitios={withCoords} />
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
        {typesPresent.map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: SITIO_META[t].color }}
              aria-hidden
            />
            {SITIO_META[t].label}
          </span>
        ))}
      </div>
    </div>
  );
}
