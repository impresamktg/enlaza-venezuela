import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RescueBoard from "@/components/RescueBoard";
import { listPosts } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mapa de rescate — Enlaza Venezuela",
  description:
    "Reportes de personas atrapadas y rescates activos en Venezuela. Ubicación, estado en vivo y contacto directo para rescatistas y maquinaria.",
};

export default async function RescatePage() {
  const posts = await listPosts();
  const rescue = posts
    .filter(
      (p) =>
        p.type === "need" &&
        (p.trapped || p.category === "rescate" || p.category === "maquinaria"),
    )
    .sort((a, b) => (a.trapped === b.trapped ? 0 : a.trapped ? -1 : 1));

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
                🆘 Mapa de rescate
              </h1>
              <p className="mt-2 text-[var(--color-muted)] max-w-2xl">
                Personas atrapadas y rescates activos. Toca <strong>Cómo llegar</strong> para
                navegar al sitio y marca el estado cuando vayas en camino o se complete.
              </p>
            </div>
            <Link
              href="/reportar"
              className="shrink-0 rounded-xl bg-[var(--color-need)] text-white font-bold px-5 py-3 text-center hover:brightness-95 transition"
            >
              🆘 Reportar persona atrapada
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
