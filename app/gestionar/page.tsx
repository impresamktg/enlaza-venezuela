import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ManagePost from "@/components/ManagePost";
import { getPostById } from "@/lib/db";
import { CATEGORY_MAP, cityName } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GestionarPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;
  const post = id ? await getPostById(id) : null;

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-8">
          <Link
            href="/"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Volver al tablón
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Gestionar publicación</h1>

          {!id || !token ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              Enlace incompleto. Usa el enlace privado que recibiste al publicar.
            </p>
          ) : !post ? (
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              No encontramos esta publicación. Es posible que ya haya sido eliminada.
            </p>
          ) : (
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl" aria-hidden>
                  {CATEGORY_MAP[post.category]?.icon ?? "🤝"}
                </span>
                <div>
                  <h2 className="font-semibold leading-snug">{post.title}</h2>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    {post.type === "need" ? "Necesita" : "Ofrece"} ·{" "}
                    {CATEGORY_MAP[post.category]?.label} · 📍 {cityName(post.city)}
                    {post.zone ? ` · ${post.zone}` : ""}
                  </p>
                  {post.status === "resolved" && (
                    <p className="text-xs font-semibold text-[var(--color-offer)] mt-1">
                      ✓ Marcada como resuelta
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <ManagePost postId={post.id} token={token} variant="page" />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
