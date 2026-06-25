import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import { getPostById } from "@/lib/db";
import { CATEGORY_MAP, cityName } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) return { title: "Publicación no encontrada — Enlaza Venezuela" };
  const verb = post.type === "need" ? "Necesita" : "Ofrece";
  const title = `${verb}: ${post.title} — Enlaza Venezuela`;
  const desc = `${CATEGORY_MAP[post.category]?.label ?? ""} · ${cityName(post.city)}${
    post.zone ? " · " + post.zone : ""
  }. Contacta por WhatsApp en Enlaza Venezuela.`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc },
    twitter: { title, description: desc },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostById(id);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-md px-4 py-8">
          <Link
            href="/"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Volver al tablón
          </Link>

          {!post ? (
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <div className="text-4xl mb-3" aria-hidden>
                🔎
              </div>
              <h1 className="font-semibold">Publicación no encontrada</h1>
              <p className="text-sm text-[var(--color-muted)] mt-1">
                Es posible que ya haya sido resuelta o eliminada.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 rounded-xl bg-[var(--color-ink)] text-white font-medium px-5 py-2.5"
              >
                Ver el tablón
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-3 text-xl font-bold tracking-tight">
                {post.type === "need" ? "Alguien necesita ayuda" : "Alguien ofrece ayuda"}
              </h1>
              <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">
                Publicación en Enlaza Venezuela · contacta directamente por WhatsApp.
              </p>
              <PostCard post={post} />
              <Link
                href="/"
                className="block text-center mt-5 text-sm font-medium text-[var(--color-ve-blue)] hover:underline"
              >
                Ver todas las publicaciones →
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
