import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import { getPostById, getCorroborations, findMatches } from "@/lib/db";
import { getPoolPostById } from "@/lib/pool";
import { isRescueClosed } from "@/lib/types";
import { CATEGORY_MAP, cityName } from "@/lib/data";
import { whatsappHref } from "@/lib/format";

export const dynamic = "force-dynamic";

// Las publicaciones de la red (IA911) tienen id sintético "ia911-…" y no viven
// en nuestra BD: se resuelven desde el pool en caché.
const resolvePost = (id: string) =>
  id.startsWith("ia911-") ? getPoolPostById(id) : getPostById(id);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await resolvePost(id);
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
  const post = await resolvePost(id);
  const corroborations =
    post && post.corroboration_count > 0 ? await getCorroborations(post.id) : [];
  // Emparejamiento: el lado opuesto (oferta↔necesidad) en la misma categoría y
  // ciudad. Solo para publicaciones activas y abiertas.
  const matches =
    post && post.status === "active" && !isRescueClosed(post.rescue_state)
      ? await findMatches(post)
      : [];

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
                {post.source
                  ? `Reporte de la red de ayuda (vía ${post.source}) · contacta directamente por WhatsApp.`
                  : "Publicación en Enlaza Venezuela · contacta directamente por WhatsApp."}
              </p>
              <PostCard post={post} />
              {post.source && post.source_url && (
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  Ver reporte original ↗
                </a>
              )}
              {corroborations.length > 0 && (
                <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <h2 className="text-sm font-bold text-[var(--color-need-strong)]">
                    🔴 Reportado por {corroborations.length + 1} personas
                  </h2>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 mb-3">
                    Varias personas reportan este mismo lugar. Más formas de contactar:
                  </p>
                  <ul className="flex flex-col gap-2">
                    {corroborations.map((c, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{c.contact_name}</span>
                        <a
                          href={whatsappHref(
                            c.contact_phone,
                            `Hola ${c.contact_name}, vi tu reporte en Enlaza Venezuela y quiero ayudar.`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-white font-semibold text-sm px-3 py-2"
                        >
                          💬 WhatsApp
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {matches.length > 0 && (
                <section className="mt-6">
                  <h2 className="text-sm font-bold text-[var(--color-ink)]">
                    {post.type === "need"
                      ? "Ofertas que pueden ayudarte"
                      : "Quién necesita lo que ofreces"}{" "}
                    <span className="font-normal text-[var(--color-muted)]">
                      · {matches.length}
                    </span>
                  </h2>
                  <p className="mt-0.5 mb-3 text-xs text-[var(--color-muted)]">
                    Misma categoría y ciudad. Contacta directamente por WhatsApp.
                  </p>
                  <div className="flex flex-col gap-3">
                    {matches.map((m) => (
                      <PostCard key={m.id} post={m} detailHref={`/post/${m.id}`} />
                    ))}
                  </div>
                </section>
              )}
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
