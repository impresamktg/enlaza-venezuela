import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import { listPosts } from "@/lib/db";
import { CATEGORIES } from "@/lib/data";
import { isRescueClosed } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Directorio de ofertas — Enlaza Venezuela",
  description:
    "Quién ofrece ayuda, por categoría: transporte, maquinaria, refugio, alimentos, salud, oficios y más. Contacta directamente por WhatsApp.",
};

export default async function DirectorioPage() {
  const all = await listPosts({ type: "offer" });
  const offers = all.filter((p) => !isRescueClosed(p.rescue_state));
  // Agrupar por categoría, respetando el orden de CATEGORIES.
  const groups = CATEGORIES.map((c) => ({
    category: c,
    items: offers.filter((p) => p.category === c.id),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link
            href="/"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Inicio
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            Directorio de ofertas
          </h1>
          <p className="mt-2 text-[var(--color-muted)] max-w-prose">
            Quién ofrece ayuda, por categoría. Contacta directamente por WhatsApp.{" "}
            <Link
              href="/publicar?tipo=offer"
              className="font-semibold text-[var(--color-offer)] hover:underline"
            >
              Ofrecer algo →
            </Link>
          </p>

          {groups.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <p className="text-sm text-[var(--color-muted)]">
                Aún no hay ofertas publicadas.{" "}
                <Link
                  href="/publicar?tipo=offer"
                  className="font-semibold text-[var(--color-offer)] hover:underline"
                >
                  Sé el primero en ofrecer ayuda.
                </Link>
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-8">
              {groups.map((g) => (
                <section key={g.category.id}>
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                    <span aria-hidden>{g.category.icon}</span>
                    {g.category.label}
                    <span className="text-sm font-normal text-[var(--color-muted)]">
                      · {g.items.length}
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((p) => (
                      <PostCard key={p.id} post={p} detailHref={`/post/${p.id}`} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
