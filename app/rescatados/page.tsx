import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RescuedRegistry from "@/components/RescuedRegistry";
import { listPosts } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rescatados — Enlaza Venezuela",
  description:
    "Registro de personas y casos marcados como rescatados tras los terremotos. Busca por nombre, edificio o zona.",
};

export default async function RescatadosPage() {
  const posts = await listPosts();
  const rescued = posts
    .filter((p) => p.rescue_state === "rescatados")
    .sort((a, b) => (b.rescued_at ?? "").localeCompare(a.rescued_at ?? ""));

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link
            href="/rescate"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Mapa de rescate
          </Link>

          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--color-offer)" }}>
            ✅ Rescatados
          </h1>
          <p className="mt-2 text-[var(--color-muted)] max-w-2xl">
            Registro de casos marcados como rescatados. Busca un nombre, edificio o zona
            para consultar. Si alguno se marcó por error, ábrelo y toca{" "}
            <strong>Volver a activo</strong>.
          </p>

          <div className="mt-6">
            <RescuedRegistry posts={rescued} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
