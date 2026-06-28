import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RescueBoard from "@/components/RescueBoard";
import { listPosts, listRescued } from "@/lib/db";
import { isRescueClosed } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lugares con personas atrapadas — Enlaza Venezuela",
  description:
    "Pedidos de ayuda en lugares donde hay personas atrapadas. Ubicación y contacto directo por WhatsApp para que quien pueda ayudar coordine. Enlaza no coordina rescates.",
};

export default async function RescatePage() {
  const [posts, rescued] = await Promise.all([listPosts(), listRescued()]);
  const isRescue = (p: (typeof posts)[number]) =>
    p.type === "need" &&
    (p.trapped || p.category === "rescate" || p.category === "maquinaria");
  const rescue = posts
    .filter((p) => isRescue(p) && !isRescueClosed(p.rescue_state))
    .sort((a, b) => (a.trapped === b.trapped ? 0 : a.trapped ? -1 : 1));
  // Registro permanente: cuenta todos los rescatados, no solo los activos.
  const rescuedCount = rescued.length;

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

          <div className="mt-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-need)]">
                🆘 Lugares con personas atrapadas
              </h1>
              <p className="mt-2 text-[var(--color-muted)] max-w-2xl">
                Pedidos de ayuda donde hay personas atrapadas. Toca <strong>Cómo llegar</strong>{" "}
                y contacta por WhatsApp para coordinar. Enlaza no envía equipos de rescate:
                conecta a quien puede ayudar.
              </p>
              <Link
                href="/rescatados"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: "var(--color-offer)" }}
              >
                ✅ Ver rescatados{rescuedCount > 0 ? ` (${rescuedCount})` : ""} →
              </Link>
            </div>
            <Link
              href="/reportar"
              className="shrink-0 rounded-xl bg-[var(--color-need)] text-white font-bold px-5 py-3 text-center hover:brightness-95 transition"
            >
              🆘 Pedir ayuda para un lugar
            </Link>
          </div>

          <div className="mt-6">
            <RescueBoard posts={rescue} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
