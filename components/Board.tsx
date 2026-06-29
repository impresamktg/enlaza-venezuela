"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, CITIES } from "@/lib/data";
import { isRescueClosed, type Post, type PostType } from "@/lib/types";
import { getTokens } from "@/lib/manage-tokens";
import { getSupabase } from "@/lib/supabase";
import { postCoords, haversineKm, type LatLng } from "@/lib/geo";
import { isUrgent } from "@/lib/board-page";
import PostCard from "./PostCard";

// Cuántas tarjetas añade cada "Ver más" (y el bloque inicial). Múltiplo de 3
// para llenar filas completas en la rejilla de 3 columnas en escritorio.
const PAGE_STEP = 9;

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

export default function Board({
  posts,
  rescuedCount = 0,
}: {
  posts: Post[];
  /** Total de casos rescatados (registro permanente, incluye los resueltos). */
  rescuedCount?: number;
}) {
  const [type, setType] = useState<PostType>("need");
  const [city, setCity] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [view, setView] = useState<ViewMode>("list");
  const [visible, setVisible] = useState(PAGE_STEP);

  const router = useRouter();

  // Carga los tokens de gestión de las publicaciones creadas en este navegador.
  useEffect(() => {
    setTokens(getTokens());
  }, [posts]);

  // Actualización al instante con Supabase Realtime: cualquier cambio en la
  // tabla posts dispara un refresh (con pequeño debounce).
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("public:posts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 600);
        },
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Respaldo: re-consulta cada 30 s (solo con la pestaña visible) por si
  // Realtime se desconecta. router.refresh() conserva filtros, vista y mapa.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [router]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      // Los casos cerrados (rescatados/resueltos) salen del tablón activo.
      if (isRescueClosed(p.rescue_state)) return false;
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
    // Urgentes (atrapados + rescate/maquinaria) siempre primero; luego por
    // cercanía (si hay ubicación) y, en igualdad, se conserva el orden reciente.
    items.sort((a, b) => {
      const ua = isUrgent(a.post) ? 0 : 1;
      const ub = isUrgent(b.post) ? 0 : 1;
      if (ua !== ub) return ua - ub;
      if (userLoc) return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      // Sin ubicación: más reciente primero, así las de la red (pool) se entremezclan
      // con las propias en vez de quedar todas al final.
      return b.post.created_at.localeCompare(a.post.created_at);
    });
    return items;
  }, [filtered, userLoc]);

  // Al cambiar filtros/tipo/búsqueda, reinicia el "Ver más". Patrón "ajustar estado
  // durante el render" recomendado por React, en vez de un efecto que encadena renders.
  const filterKey = `${type}|${city}|${category}|${query}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisible(PAGE_STEP);
  }

  // El "cluster de rescate" (personas atrapadas + solicitudes de rescate/maquinaria)
  // NO inunda el tablón: se resume en un aviso que lleva a la vista dedicada
  // (/rescate). El tablón principal queda para el marketplace de necesidades ↔
  // ofertas y no lo domina el rescate. Solo aplica a la pestaña "Necesitan ayuda";
  // en ofertas, una excavadora ofrecida es una publicación válida del directorio.
  const rescueItems = useMemo(
    () => (type === "need" ? displayed.filter((d) => isUrgent(d.post)) : []),
    [displayed, type],
  );
  const mainItems = useMemo(
    () => (type === "need" ? displayed.filter((d) => !isUrgent(d.post)) : displayed),
    [displayed, type],
  );

  // Lista acotada que crece con "Ver más" en la misma página, para no renderizar
  // cientos de tarjetas en redes lentas.
  const listItems = useMemo(() => mainItems.slice(0, visible), [mainItems, visible]);
  const hasMore = mainItems.length > visible;

  const selectClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ve-blue)]/30";

  return (
    <section className="flex flex-col gap-5">
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
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 font-medium"
            style={{ color: "var(--color-offer)" }}
            title="El tablón se actualiza automáticamente"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-offer)] pulse-dot" />
            En vivo
          </span>
          <span>
            {filtered.length} {filtered.length === 1 ? "publicación" : "publicaciones"}
            {geoState === "on" && " · ordenadas por cercanía"}
          </span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/rescatados"
            className="inline-flex items-center gap-1.5 font-medium hover:underline"
            style={{ color: "var(--color-offer)" }}
          >
            ✅ Ver rescatados{rescuedCount > 0 ? ` (${rescuedCount})` : ""}
          </Link>
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

      {view === "map" ? (
        <MapView items={displayed} userLoc={userLoc} />
      ) : displayed.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Aviso resumen del rescate (no inunda el tablón). */}
          {rescueItems.length > 0 && (
            <Link
              href="/rescate"
              className="flex items-center gap-3 rounded-2xl border px-4 py-3 transition hover:brightness-95"
              style={{
                borderColor: "var(--color-need-strong)",
                background: "var(--color-need-soft)",
              }}
            >
              <span className="text-xl" aria-hidden>
                🆘
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block text-sm font-bold"
                  style={{ color: "var(--color-need-strong)" }}
                >
                  {rescueItems.length}{" "}
                  {rescueItems.length === 1 ? "solicitud" : "solicitudes"} de rescate
                </span>
                <span className="block text-xs text-[var(--color-ink)]/70">
                  Personas atrapadas, maquinaria y brigadas. Enlaza no envía equipos:
                  difunde y contacta a quien pueda ayudar.
                </span>
              </span>
              <span
                className="shrink-0 text-sm font-semibold"
                style={{ color: "var(--color-need-strong)" }}
                aria-hidden
              >
                Ver todas →
              </span>
            </Link>
          )}

          {listItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listItems.map(({ post, distanceKm }) => (
                <PostCard
                  key={post.id}
                  post={post}
                  manageToken={tokens[post.id]}
                  distanceKm={distanceKm}
                  detailHref={post.source ? undefined : `/post/${post.id}`}
                />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-[var(--color-muted)]">
              No hay otras solicitudes con estos filtros.
            </p>
          )}

          {hasMore && (
            <div className="mt-2 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_STEP)}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 font-semibold min-h-[48px] hover:border-[var(--color-ve-blue)] transition"
              >
                Ver más publicaciones
              </button>
              <span className="text-xs text-[var(--color-muted)] text-center">
                Mostrando {listItems.length} de {mainItems.length} ·{" "}
                <button
                  type="button"
                  onClick={() => setVisible(mainItems.length)}
                  className="underline hover:text-[var(--color-ink)]"
                >
                  Ver todas
                </button>
              </span>
            </div>
          )}
        </>
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
