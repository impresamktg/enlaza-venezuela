import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostForm from "@/components/PostForm";
import type { PostType } from "@/lib/types";

export default async function PublicarPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const sp = await searchParams;
  const defaultType: PostType = sp.tipo === "offer" ? "offer" : "need";

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Link
            href="/"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Volver al tablón
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            Publicar ayuda
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Completa el formulario. Tu publicación aparecerá de inmediato en el tablón y
            las personas podrán contactarte por WhatsApp.
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
            <PostForm defaultType={defaultType} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
