import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SitioCard from "@/components/SitioCard";
import SitiosMapPanel from "@/components/SitiosMapPanel";
import {
  listSitios,
  SITIO_META,
  SITIO_ORDER,
  SITIOS_SOURCE,
  SITIOS_SOURCE_URL,
  type SitioType,
} from "@/lib/sitios";

export const metadata: Metadata = {
  title: "Centros de ayuda — Enlaza Venezuela",
  description:
    "Centros de acopio, refugios, clínicas y hospitales activos tras los terremotos en Venezuela, reportados por la comunidad en terreno.",
};

/** searchParams puede traer string | string[] (p. ej. ?q=a&q=b): toma el primero. */
const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SitiosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string | string[]; q?: string | string[] }>;
}) {
  const sp = await searchParams;
  const query = first(sp.q).trim();
  const needle = query.toLowerCase();
  const tipoParam = first(sp.tipo);
  const activeType = SITIO_ORDER.find((t) => t === tipoParam) ?? null;

  const all = await listSitios();

  const filtered = all.filter((s) => {
    if (activeType && s.type !== activeType) return false;
    if (needle) {
      const hay = `${s.name} ${s.municipio ?? ""} ${s.needs.join(" ")}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const groups = SITIO_ORDER.map((t) => ({
    type: t,
    items: filtered.filter((s) => s.type === t),
  })).filter((g) => g.items.length > 0);

  // Enlace de filtro por tipo, preservando la búsqueda de texto.
  const filterHref = (t: SitioType | null) => {
    const p = new URLSearchParams();
    if (t) p.set("tipo", t);
    if (query) p.set("q", query);
    const s = p.toString();
    return s ? `/sitios?${s}` : "/sitios";
  };
  const counts = SITIO_ORDER.map((t) => ({
    type: t,
    n: all.filter((s) => s.type === t).length,
  })).filter((c) => c.n > 0);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "bg-[var(--color-ve-blue)] text-white"
        : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
    }`;

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link
            href="/"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Volver al tablón
          </Link>

          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            Centros de ayuda
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--color-muted)]">
            Centros de acopio, refugios, clínicas y hospitales reportados por la comunidad
            en terreno. Información comunitaria y sin verificar: puede estar incompleta o
            desactualizada. Confirma antes de acudir o de llevar donaciones.
          </p>

          {/* Filtros por tipo */}
          {counts.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={filterHref(null)} className={chip(!activeType)}>
                Todos · {all.length}
              </Link>
              {counts.map((c) => (
                <Link
                  key={c.type}
                  href={filterHref(c.type)}
                  className={chip(activeType === c.type)}
                >
                  {SITIO_META[c.type].icon} {SITIO_META[c.type].plural} · {c.n}
                </Link>
              ))}
            </div>
          )}

          {/* Búsqueda por nombre / municipio / insumo (GET, sin JS) */}
          <form action="/sitios" method="get" className="mt-3 flex gap-2">
            {activeType && <input type="hidden" name="tipo" value={activeType} />}
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Nombre, municipio o insumo (p. ej. agua)…"
              aria-label="Buscar sitio"
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ve-blue)]/40"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--color-ve-blue)] px-5 font-semibold text-white transition hover:brightness-110"
            >
              Buscar
            </button>
          </form>

          {/* Mapa (refleja el filtro activo) */}
          <SitiosMapPanel sitios={filtered} />

          {all.length === 0 ? (
            <p className="mt-10 text-center text-sm text-[var(--color-muted)]">
              No pudimos cargar los centros en este momento. Intenta de nuevo en un rato.
            </p>
          ) : filtered.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <div className="mb-2 text-3xl" aria-hidden>
                📍
              </div>
              <p className="font-semibold">Sin centros que coincidan</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Prueba con otro filtro o quita la búsqueda.
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-7">
              {groups.map((g) => (
                <section key={g.type}>
                  <h2 className="mb-2 text-sm font-bold text-[var(--color-ink)]">
                    {SITIO_META[g.type].icon} {SITIO_META[g.type].plural} · {g.items.length}
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((s) => (
                      <SitioCard key={s.id} sitio={s} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <p className="mt-10 text-xs text-[var(--color-muted)]">
            Datos vía{" "}
            <a
              href={SITIOS_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--color-ink)]"
            >
              {SITIOS_SOURCE}
            </a>
            . Reportes comunitarios sin verificar.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
