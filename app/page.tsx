import Link from "next/link";
import Header from "@/components/Header";
import Board from "@/components/Board";
import Footer from "@/components/Footer";
import { listPosts, listRescued, isDemoMode } from "@/lib/db";
import { isRescueClosed } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ publicado?: string; tipo?: string }>;
}) {
  const [posts, rescued, sp] = await Promise.all([
    listPosts(),
    listRescued(),
    searchParams,
  ]);
  // Los casos cerrados (rescatados/resueltos) no cuentan como solicitudes activas.
  const open = posts.filter((p) => !isRescueClosed(p.rescue_state));
  const needs = open.filter((p) => p.type === "need").length;
  const offers = open.filter((p) => p.type === "offer").length;
  const rescueActivos = open.filter(
    (p) =>
      p.type === "need" &&
      (p.trapped || p.category === "rescate" || p.category === "maquinaria"),
  ).length;
  // El registro de rescatados es permanente: cuenta todos, no solo los activos.
  const rescuedCount = rescued.length;
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
            {/* Hero a dos columnas en escritorio: texto + cifras a la izquierda, bloque
                crítico de rescate a la derecha. En móvil se apila con el rescate alto. */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] lg:gap-x-10 gap-y-6 lg:items-start">
              {/* Texto — columna izquierda, fila 1 */}
              <div className="lg:col-start-1 lg:row-start-1">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-need-soft)] text-[var(--color-need)] text-xs font-semibold px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-need)] pulse-dot" />
                  Emergencia · Terremotos del 24 de junio de 2026
                </span>
                <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
                  Conectamos a quien <span className="text-[var(--color-offer)]">ofrece ayuda</span>{" "}
                  con quien la <span className="text-[var(--color-need)]">necesita</span>
                </h1>
                <p className="mt-3 text-[var(--color-muted)] max-w-prose">
                  Tras los sismos de magnitud 7.2 y 7.5 que afectaron a Caracas, La Guaira y el
                  centro del país, esta plataforma comunitaria conecta directamente, por
                  WhatsApp, a quien puede ayudar con quien lo necesita.
                </p>
              </div>

              {/* N1 · bloque crítico — columna derecha en escritorio, alto en móvil */}
              <div
                className="lg:col-start-2 lg:row-start-1 lg:row-span-2 rounded-2xl border p-4 sm:p-5"
                style={{
                  borderColor: "var(--color-need-strong)",
                  background: "var(--color-need-soft)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden>
                    ⛑️
                  </span>
                  <div>
                    <h2 className="font-bold" style={{ color: "var(--color-need-strong)" }}>
                      La prioridad es el rescate
                    </h2>
                    <p className="text-sm mt-1 text-[var(--color-ink)]/80">
                      Las autoridades no tienen los medios suficientes. Lo más urgente:{" "}
                      <strong>maquinaria pesada, herramientas y voluntarios con experiencia</strong>{" "}
                      para búsqueda, rescate y remoción de escombros.
                    </p>
                  </div>
                </div>
                <Link
                  href="/reportar"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl text-white font-semibold min-h-[48px] px-4 hover:brightness-95 transition"
                  style={{ background: "var(--color-need-strong)" }}
                >
                  🆘 Reportar persona atrapada
                </Link>
                <Link
                  href="/rescate"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border bg-[var(--color-surface)] font-semibold px-4 py-2.5 transition hover:bg-[var(--color-bg)]"
                  style={{
                    borderColor: "color-mix(in srgb, var(--color-need) 35%, var(--color-border))",
                    color: "var(--color-need)",
                  }}
                >
                  🗺️ Mapa de rescate{rescueActivos > 0 ? ` · ${rescueActivos} activos` : ""}
                </Link>
              </div>

              {/* N2 · acciones generales unificadas — solo móvil (en escritorio se usa el
                  botón Publicar del header y el toggle del tablón) */}
              <div className="lg:hidden">
                <p className="text-sm font-medium text-[var(--color-muted)] mb-2">
                  ¿Otro tipo de ayuda? También coordinamos refugio, alimentos, salud y más:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Link
                    href="/publicar?tipo=need"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-need)] text-white font-semibold min-h-[48px] px-4 hover:brightness-95 transition"
                  >
                    🆘 Necesito
                  </Link>
                  <Link
                    href="/publicar?tipo=offer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-offer)] text-white font-semibold min-h-[48px] px-4 hover:brightness-95 transition"
                  >
                    🙌 Ofrezco
                  </Link>
                </div>
              </div>

              {/* N3 · cifras como texto — columna izquierda fila 2 en escritorio */}
              <div className="lg:col-start-1 lg:row-start-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm self-start">
                <span>
                  <b className="text-[var(--color-need)]">{needs}</b>{" "}
                  <span className="text-[var(--color-muted)]">solicitudes activas</span>
                </span>
                <span>
                  <b className="text-[var(--color-offer)]">{offers}</b>{" "}
                  <span className="text-[var(--color-muted)]">ofertas de ayuda</span>
                </span>
                <Link href="/rescatados" className="hover:underline">
                  <b className="text-[var(--color-offer)]">{rescuedCount}</b>{" "}
                  <span className="text-[var(--color-muted)]">rescatados ›</span>
                </Link>
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
          <Board posts={posts} rescuedCount={rescuedCount} />
        </div>
      </main>

      <Footer />
    </>
  );
}
