import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MissingPersonCard from "@/components/MissingPersonCard";
import { searchMissingPersons, searchRelatedIncidents } from "@/lib/desaparecidos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar desaparecidos — Enlaza Venezuela",
  description:
    "Busca por nombre o apellido en el registro común de personas desaparecidas y encontradas tras los terremotos en Venezuela.",
};

export default async function DesaparecidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const hasQuery = query.length >= 2;

  const [people, incidents] = hasQuery
    ? await Promise.all([searchMissingPersons(query), searchRelatedIncidents(query)])
    : [[], []];

  const missing = people.filter((p) => p.status !== "encontrada");
  const found = people.filter((p) => p.status === "encontrada");

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link
            href="/"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Volver al tablón
          </Link>

          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            Buscar personas
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            Busca por nombre o apellido en el registro común (IA911) de personas
            desaparecidas y encontradas. Por protección, no mostramos edad ni ubicación
            exacta de menores de edad.
          </p>

          {/* Búsqueda (GET, sin JS) */}
          <form action="/desaparecidos" method="get" className="mt-5 flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              required
              minLength={2}
              placeholder="Nombre o apellido…"
              aria-label="Nombre o apellido"
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ve-blue)]/40"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--color-ve-blue)] px-5 font-semibold text-white transition hover:brightness-110"
            >
              Buscar
            </button>
          </form>
          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
            La búsqueda por cédula aún no está disponible: la fuente central indexa por
            nombre, no por documento.
          </p>

          {!hasQuery ? (
            <p className="mt-10 text-center text-sm text-[var(--color-muted)]">
              Escribe un nombre para empezar.
            </p>
          ) : people.length === 0 && incidents.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <div className="mb-2 text-3xl" aria-hidden>
                🔎
              </div>
              <p className="font-semibold">Sin resultados para “{query}”</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Prueba con otra forma del nombre o solo el apellido.
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-6">
              {missing.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-bold text-[var(--color-need)]">
                    Desaparecidas · {missing.length}
                  </h2>
                  <div className="flex flex-col gap-3">
                    {missing.map((p) => (
                      <MissingPersonCard key={p.id} person={p} />
                    ))}
                  </div>
                </section>
              )}

              {found.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-bold text-[var(--color-offer)]">
                    Encontradas · {found.length}
                  </h2>
                  <div className="flex flex-col gap-3">
                    {found.map((p) => (
                      <MissingPersonCard key={p.id} person={p} />
                    ))}
                  </div>
                </section>
              )}

              {incidents.length > 0 && (
                <section>
                  <h2 className="mb-1 text-sm font-bold text-[var(--color-ink)]">
                    Listas y lugares relacionados
                  </h2>
                  <p className="mb-2 text-xs text-[var(--color-muted)]">
                    Centros y listas (vía avisave) que mencionan tu búsqueda.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {incidents.map((i) => (
                      <li key={i.id}>
                        <a
                          href={i.url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 transition hover:border-[var(--color-ve-blue)]"
                        >
                          <span className="block text-sm font-semibold">{i.title}</span>
                          {i.place && (
                            <span className="block text-xs text-[var(--color-muted)]">
                              📍 {i.place}
                            </span>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="text-center text-xs text-[var(--color-muted)]">
                Resultados del registro común; pueden estar incompletos. Máximo 50
                personas por búsqueda: si no aparece, afina el nombre.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
