"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import PostCard from "./PostCard";
import type { Post } from "@/lib/types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-sm text-[var(--color-muted)]">
      Cargando mapa…
    </div>
  ),
});

/** Centro de rescate: mapa + lista (atrapados primero). Se refresca solo cada 30 s. */
export default function RescueBoard({ posts }: { posts: Post[] }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [router]);

  function share() {
    const url = `${window.location.origin}/rescate`;
    const data = {
      title: "Mapa de rescate — Enlaza Venezuela",
      text: "Personas atrapadas que necesitan rescate en Venezuela. Ayuda a difundir.",
      url,
    };
    if (navigator.share) navigator.share(data).catch(() => {});
    else navigator.clipboard?.writeText(url);
  }

  if (posts.length === 0) {
    return (
      <div className="text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-14 px-6">
        <div className="text-4xl mb-3" aria-hidden>
          🙏
        </div>
        <h3 className="font-semibold">No hay reportes de rescate activos</h3>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Cuando alguien reporte personas atrapadas, aparecerá aquí y en el mapa.
        </p>
      </div>
    );
  }

  const items = posts.map((post) => ({ post }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-offer)] pulse-dot" />
          En vivo · {posts.length} {posts.length === 1 ? "reporte" : "reportes"}
        </span>
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] font-medium px-3 py-1.5 text-sm hover:border-[var(--color-ve-blue)]"
        >
          ↗ Compartir
        </button>
      </div>

      <MapView items={items} userLoc={null} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} detailHref={`/post/${p.id}`} compact />
        ))}
      </div>
    </div>
  );
}
