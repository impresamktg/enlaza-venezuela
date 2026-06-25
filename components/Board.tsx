"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CATEGORIES, CATEGORY_MAP, CITIES } from "@/lib/data";
import type { Post, PostType } from "@/lib/types";
import { getTokens } from "@/lib/manage-tokens";
import { postCoords, haversineKm, type LatLng } from "@/lib/geo";
import PostCard from "./PostCard";

// El mapa usa Leaflet (solo en el navegador), por eso se carga sin SSR.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-sm text-[var(--color-muted)]">
      Cargando mapa…
    </div>
  ),
});

type GeoState = "idle" | "loading" | "on" | "denied" | "error";
type ViewMode = "list" | "map";

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
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [view, setView] = useState<ViewMode>("list");

  // Carga los tokens de gestión de las publicaciones creadas en este navegador.
  useEffect(() => {
    setTokens(getTokens());
  }, [posts]);

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("on");
      },
      (err) => {
        setGeoState(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function disableLocation() {
    setUserLoc(null);
    setGeoState("idle");
  }

  // Resumen por categoría (panorama general, independiente de los filtros).
  const categoryStats = useMemo(() => {
    const m = new Map<string, { need: number; offer: number }>();
    for (const p of posts) {
      const e = m.get(p.category) ?? { need: 0, offer: 0 };
      if (p.type === "need") e.need++;
      else e.offer++;
      m.set(p.category, e);
    }
    return [...m.entries()]
      .map(([id, c]) => ({ id, ...c, total: c.need + c.offer, cat: CATEGORY_MAP[id] }))
      .filter((x) => x.cat)
      .sort((a, b) => b.total - a.total);
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

  // Calcula distancias y ordena por cercanía cuando hay ubicación del usuario.
  const displayed = useMemo(() => {
    const items = filtered.map((post) => {
      let distanceKm: number | undefined;
      if (userLoc) {
        const c = postCoords(post);
        if (c) distanceKm = haversineKm(userLoc, c);
      }
      return { post, distanceKm };
    });
    if (userLoc) {
      items.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return items;
  }, [filtered, userLoc]);

  const selectClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ve-blue)]/30";

  return (
    <section className="flex flex-col gap-5">
      {/* Resumen por categoría — clic para filtrar */}
      {categoryStats.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
          {categoryStats.map((s) => {
            const active = category === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCategory(active ? "all" : s.id)}
                className="shrink-0 flex items-center gap-2.5 rounded-xl border bg-[var(--color-surface)] px-3 py-2 transition-colors hover:border-[var(--color-ink)]"
                style={{ borderColor: active ? "var(--color-ink)" : "var(--color-border)" }}
              >
                <span className="text-xl" aria-hidden>
                  {s.cat.icon}
                </span>
                <div className="text-left">
                  <div className="text-sm font-medium leading-tight whitespace-nowrap">
                    {s.cat.label}
                  </div>
                  <div className="text-xs leading-tight mt-0.5 whitespace-nowrap">
                    <span style={{ color: "var(--color-need)" }}>🆘 {s.need}</span>
                    <span className="text-[var(--color-muted)]"> · </span>
                    <span style={{ color: "var(--color-offer)" }}>🙌 {s.offer}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Toggle de tipo + vista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex gap-1.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-1.5">
          {(["list", "map"] as ViewMode[]).map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={
                  active
                    ? { background: "var(--color-ink)", color: "#fff" }
                    : { color: "var(--color-muted)" }
                }
              >
                {v === "list" ? "📋 Lista" : "🗺️ Mapa"}
              </button>
            );
          })}
        </div>
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-muted)]">
        <span>
          {filtered.length} {filtered.length === 1 ? "publicación" : "publicaciones"}
          {geoState === "on" && " · ordenadas por cercanía"}
        </span>
        <div className="flex items-center gap-3">
          {geoState === "on" ? (
            <button
              onClick={disableLocation}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ve-blue)]/10 text-[var(--color-ve-blue)] font-medium px-3 py-1.5"
            >
              📍 Cerca de ti
              <span className="opacity-60">✕</span>
            </button>
          ) : (
            <button
              onClick={requestLocation}
              disabled={geoState === "loading"}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] font-medium px-3 py-1.5 hover:border-[var(--color-ve-blue)] disabled:opacity-60"
            >
              📍 {geoState === "loading" ? "Ubicando…" : "Más cercanos a mí"}
            </button>
          )}
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
      </div>

      {(geoState === "denied" || geoState === "error") && (
        <p className="-mt-2 text-xs text-[var(--color-muted)]">
          {geoState === "denied"
            ? "No se pudo acceder a tu ubicación (permiso denegado). Puedes filtrar por ciudad."
            : "Tu navegador no pudo obtener la ubicación. Puedes filtrar por ciudad."}
        </p>
      )}

      {displayed.length === 0 ? (
        <EmptyState />
      ) : view === "map" ? (
        <MapView items={displayed} userLoc={userLoc} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(({ post, distanceKm }) => (
            <PostCard
              key={post.id}
              post={post}
              manageToken={tokens[post.id]}
              distanceKm={distanceKm}
            />
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
