import Link from "next/link";
import Header from "@/components/Header";
import Board from "@/components/Board";
import Footer from "@/components/Footer";
import { listPosts, isDemoMode } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ publicado?: string; tipo?: string }>;
}) {
  const [posts, sp] = await Promise.all([listPosts(), searchParams]);
  const needs = posts.filter((p) => p.type === "need").length;
  const offers = posts.filter((p) => p.type === "offer").length;
  const published = sp.publicado === "1";

  return (
    <>
      <Header />

      {isDemoMode() && (
        <div className="bg-[var(--color-ve-yellow)]/20 border-b border-[var(--color-ve-yellow)]/40 text-[var(--color-ink)] text-center text-xs sm:text-sm px-4 py-2">
          <strong>Modo demostración:</strong> mostrando datos de ejemplo. Configura
          Supabase (ver <code>README.md</code>) para guardar publicaciones reales.
        </div>
      )}

      <main className="flex-1">
        {/* Hero / situación */}
        <section className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-need-soft)] text-[var(--color-need)] text-xs font-semibold px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-need)] animate-pulse" />
              Emergencia · Terremotos del 24 de junio de 2026
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl">
              Conectamos a quien <span className="text-[var(--color-offer)]">ofrece ayuda</span>{" "}
              con quien la <span className="text-[var(--color-need)]">necesita</span>
            </h1>
            <p className="mt-3 text-[var(--color-muted)] max-w-2xl">
              Tras los sismos de magnitud 7.2 y 7.5 que afectaron a Caracas, La Guaira y el
              centro del país, esta plataforma comunitaria conecta directamente, por
              WhatsApp, a quien puede ayudar con quien lo necesita.
            </p>

            {/* Prioridad: rescate */}
            <div
              className="mt-5 max-w-2xl rounded-2xl border-2 p-4 sm:p-5"
              style={{
                borderColor: "var(--color-need)",
                background: "var(--color-need-soft)",
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none" aria-hidden>
                  ⛑️
                </span>
                <div>
                  <h2 className="font-bold text-[var(--color-need)]">
                    La prioridad es el rescate
                  </h2>
                  <p className="text-sm mt-1 text-[var(--color-ink)]/80">
                    Las autoridades no tienen los medios, las herramientas ni la gente
                    suficientes. Lo más urgente:{" "}
                    <strong>maquinaria pesada, herramientas y voluntarios con experiencia</strong>{" "}
                    para búsqueda, rescate y remoción de escombros. Refugio, alimentos y
                    salud también ayudan, pero el rescate no puede esperar.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/reportar"
                      className="rounded-xl bg-[var(--color-need)] text-white font-semibold px-4 py-2.5 text-sm hover:brightness-95 transition"
                    >
                      🆘 Reportar persona atrapada
                    </Link>
                    <Link
                      href="/rescate"
                      className="rounded-xl border-2 font-semibold px-4 py-2.5 text-sm transition hover:bg-white"
                      style={{ borderColor: "var(--color-need)", color: "var(--color-need)" }}
                    >
                      🗺️ Ver mapa de rescate
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm font-medium text-[var(--color-muted)]">
              ¿Otro tipo de ayuda? También coordinamos refugio, alimentos, salud y más:
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/publicar?tipo=need"
                className="rounded-xl bg-[var(--color-need)] text-white font-semibold px-5 py-3 hover:brightness-95 transition"
              >
                🆘 Necesito ayuda
              </Link>
              <Link
                href="/publicar?tipo=offer"
                className="rounded-xl bg-[var(--color-offer)] text-white font-semibold px-5 py-3 hover:brightness-95 transition"
              >
                🙌 Quiero ayudar
              </Link>
            </div>

            <div className="mt-6 flex gap-6 text-sm">
              <div>
                <div className="text-2xl font-bold text-[var(--color-need)]">{needs}</div>
                <div className="text-[var(--color-muted)]">solicitudes activas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--color-offer)]">{offers}</div>
                <div className="text-[var(--color-muted)]">ofertas de ayuda</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-8">
          {published && (
            <div className="mb-6 rounded-xl bg-[var(--color-offer-soft)] text-[var(--color-offer)] px-4 py-3 text-sm font-medium">
              ✅ ¡Tu publicación está activa! Pronto alguien te contactará por WhatsApp.
            </div>
          )}
          <Board posts={posts} />
        </div>
      </main>

      <Footer />
    </>
  );
}
