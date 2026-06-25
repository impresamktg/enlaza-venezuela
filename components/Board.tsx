"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CITIES } from "@/lib/data";
import type { Post, PostType } from "@/lib/types";
import { getTokens } from "@/lib/manage-tokens";
import PostCard from "./PostCard";

const TYPE_TABS: { id: PostType; label: string; color: string }[] = [
  { id: "need", label: "Necesitan ayuda", color: "var(--color-need)" },
  { id: "offer", label: "Ofrecen ayuda", color: "var(--color-offer)" },
];

export default function Board({ posts }: { posts: Post[] }) {
  const [type, setType] = useState<PostType>("need");
  const [city, setCity] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [tokens, setTokens] = useState<Record<string, string>>({});

  // Carga los tokens de gestión de las publicaciones creadas en este navegador.
  useEffect(() => {
    setTokens(getTokens());
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (p.type !== type) return false;
      if (city !== "all" && p.city !== city) return false;
      if (category !== "all" && p.category !== category) return false;
      if (q) {
        const hay = `${p.title} ${p.description ?? ""} ${p.zone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, type, city, category, query]);

  const selectClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ve-blue)]/30";

  return (
    <section className="flex flex-col gap-5">
      {/* Toggle de tipo */}
      <div className="flex gap-1.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-1.5 w-full sm:w-fit">
        {TYPE_TABS.map((tab) => {
          const active = type === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={
                active
                  ? { background: tab.color, color: "#fff" }
                  : { color: "var(--color-muted)" }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select className={selectClass} value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="all">Todas las ciudades</option>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>

        <input
          className={selectClass}
          type="search"
          placeholder="Buscar (ej: agua, camión, niños)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span>
          {filtered.length} {filtered.length === 1 ? "publicación" : "publicaciones"}
        </span>
        {(city !== "all" || category !== "all" || query) && (
          <button
            onClick={() => {
              setCity("all");
              setCategory("all");
              setQuery("");
            }}
            className="underline hover:text-[var(--color-ink)]"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} manageToken={tokens[post.id]} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-14 px-6">
      <div className="text-4xl mb-3" aria-hidden>
        🔎
      </div>
      <h3 className="font-semibold">No hay publicaciones con estos filtros</h3>
      <p className="text-sm text-[var(--color-muted)] mt-1 max-w-sm mx-auto">
        Prueba quitando algún filtro, o sé la primera persona en publicar para esta
        necesidad u oferta.
      </p>
      <Link
        href="/publicar"
        className="inline-block mt-4 rounded-xl bg-[var(--color-ink)] text-white font-medium px-5 py-2.5"
      >
        Publicar ahora
      </Link>
    </div>
  );
}
