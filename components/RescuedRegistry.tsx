"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PostCard from "./PostCard";
import type { Post } from "@/lib/types";
import { cityName } from "@/lib/data";

/** Registro buscable de personas marcadas como rescatadas. Se refresca solo cada 30 s. */
export default function RescuedRegistry({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const hay = `${p.title} ${p.address ?? ""} ${p.zone ?? ""} ${cityName(p.city)} ${p.description ?? ""} ${p.contact_name}`.toLowerCase();
      return hay.includes(q);
    });
  }, [posts, query]);

  const fieldClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-offer)]/30";

  return (
    <div className="flex flex-col gap-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={fieldClass}
        placeholder="Buscar por nombre, edificio, zona o ciudad…"
      />

      <p className="text-sm text-[var(--color-muted)]">
        {filtered.length} {filtered.length === 1 ? "persona/caso" : "personas/casos"}
        {query ? " · resultado de búsqueda" : " marcados como rescatados"}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-14 px-6">
          <div className="text-4xl mb-3" aria-hidden>
            {query ? "🔎" : "📋"}
          </div>
          <h3 className="font-semibold">
            {query ? "Sin resultados" : "Aún no hay casos rescatados"}
          </h3>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {query
              ? "Prueba con otro nombre, edificio o zona."
              : "Cuando un caso se marque como rescatado, quedará registrado aquí."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} detailHref={`/post/${p.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
