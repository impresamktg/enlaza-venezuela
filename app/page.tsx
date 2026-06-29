import Link from "next/link";
import Header from "@/components/Header";
import Board from "@/components/Board";
import Footer from "@/components/Footer";
import ShareSheet from "@/components/ShareSheet";
import { listPosts, listRescued, isDemoMode } from "@/lib/db";
import { listPool } from "@/lib/pool";
import { isRescueClosed } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ publicado?: string; tipo?: string }>;
}) {
  const [posts, rescued, pool, sp] = await Promise.all([
    listPosts(),
    listRescued(),
    listPool(), // necesidades + recursos del pool común IA911 (toda la red)
    searchParams,
  ]);
  // Propias + las de la red, en el mismo tablón.
  const allPosts = [...posts, ...pool];
  // Los casos cerrados (rescatados/resueltos) no cuentan como solicitudes activas.
  const open = allPosts.filter((p) => !isRescueClosed(p.rescue_state));
  const needs = open.filter((p) => p.type === "need").length;
  const offers = open.filter((p) => p.type === "offer").length;
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
        {/* Hero · dos puertas. El home se mantiene simple a propósito: solo dos
            acciones claras. Lo demás (incluidos los lugares con personas atrapadas)
            vive en el tablón de abajo. */}
        <section className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-need-soft)] text-[var(--color-need)] text-xs font-semibold px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-need)] pulse-dot" />
              Emergencia · Terremotos del 24 de junio de 2026
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              ¿Necesitas ayuda o puedes ayudar?
            </h1>
            <p className="mt-3 text-[var(--color-muted)] max-w-prose mx-auto">
              Enlaza conecta directamente, por WhatsApp, a quien necesita algo con
              quien puede ofrecerlo. Elige una opción:
            </p>

            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
              <Link
                href="/publicar?tipo=need"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-need)] text-white font-bold text-lg min-h-[64px] px-6 hover:brightness-95 transition"
              >
                🆘 Necesito ayuda
              </Link>
              <Link
                href="/publicar?tipo=offer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-offer)] text-white font-bold text-lg min-h-[64px] px-6 hover:brightness-95 transition"
              >
                🙌 Puedo ayudar
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/desaparecidos"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ve-blue)] hover:underline"
              >
                🔎 ¿Buscas a una persona? Búscala aquí →
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap justify-center items-center gap-x-5 gap-y-1 text-sm">
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
        </section>

        <div className="mx-auto max-w-6xl px-4 py-8">
          {published && (
            <div className="mb-6 rounded-xl bg-[var(--color-offer-soft)] text-[var(--color-offer)] px-4 py-3 text-sm font-medium">
              ✅ ¡Tu publicación está activa! Pronto alguien te contactará por WhatsApp.
            </div>
          )}
          <Board posts={allPosts} rescuedCount={rescuedCount} />

          {/* Corre la voz · difundir el proyecto para que llegue a más gente. */}
          <section className="mx-auto mt-10 max-w-2xl">
            <ShareSheet
              variant="section"
              heading="Corre la voz"
              subtext="Cuanta más gente lo sepa, más rápido se conecta la ayuda. Compártelo con tu familia, vecinos y grupos de WhatsApp."
              title="Enlaza Venezuela"
              message="🆘 Tras los terremotos en Venezuela, Enlaza conecta por WhatsApp a quien necesita ayuda con quien puede darla. Si necesitas algo o puedes ayudar, entra:"
              url="/"
              storyUrl="/story"
            />
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
