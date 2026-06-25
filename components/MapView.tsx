"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Post } from "@/lib/types";
import { CATEGORY_MAP, cityName } from "@/lib/data";
import { postCoords, formatDistance, type LatLng } from "@/lib/geo";
import { whatsappHref } from "@/lib/format";

const CARACAS: [number, number] = [10.4806, -66.9036];

export interface MapItem {
  post: Post;
  distanceKm?: number;
}

export default function MapView({
  items,
  userLoc,
}: {
  items: MapItem[];
  userLoc: LatLng | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const lastSigRef = useRef<string>("");

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(CARACAS, 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Pinta los marcadores cuando cambian los datos.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    // Solo reconstruir (y reencuadrar) si cambiaron los datos: así la
    // actualización automática no reinicia el zoom/desplazamiento del usuario.
    const sig =
      items
        .map((i) => `${i.post.id}:${i.post.lat ?? ""}:${i.post.lng ?? ""}`)
        .join("|") + `#${userLoc ? `${userLoc.lat},${userLoc.lng}` : ""}`;
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    layer.clearLayers();
    const bounds: [number, number][] = [];

    for (const { post, distanceKm } of items) {
      const c = postCoords(post);
      if (!c) continue;
      const isNeed = post.type === "need";
      const color = isNeed ? "#e11d48" : "#059669";
      const cat = CATEGORY_MAP[post.category];
      const dist =
        typeof distanceKm === "number" ? ` · ${formatDistance(distanceKm)}` : "";
      const wa = whatsappHref(
        post.contact_phone,
        `Hola ${post.contact_name}, vi tu publicación en Enlaza Venezuela ("${post.title}").`,
      );
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      });
      marker.bindPopup(
        `<div style="min-width:190px;font-family:system-ui,sans-serif">
          <div style="font-weight:700;font-size:12px;color:${color}">${isNeed ? "NECESITA" : "OFRECE"}</div>
          <div style="font-weight:600;margin:2px 0;color:#1c1917">${esc(post.title)}</div>
          <div style="font-size:12px;color:#78716c">${cat ? esc(cat.icon + " " + cat.label) : ""}</div>
          <div style="font-size:12px;color:#78716c;margin-top:2px">📍 ${esc(cityName(post.city))}${post.zone ? " · " + esc(post.zone) : ""}${esc(dist)}</div>
          <a href="${wa}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin-top:8px;background:#25D366;color:#fff;font-weight:600;padding:7px;border-radius:8px;text-decoration:none">💬 Contactar a ${esc(post.contact_name.split(" ")[0])}</a>
        </div>`,
      );
      marker.addTo(layer);
      bounds.push([c.lat, c.lng]);
    }

    if (userLoc) {
      L.circleMarker([userLoc.lat, userLoc.lng], {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: "#1e3a8a",
        fillOpacity: 1,
      })
        .bindPopup("Tu ubicación")
        .addTo(layer);
      bounds.push([userLoc.lat, userLoc.lng]);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else {
      map.setView(CARACAS, 11);
    }
  }, [items, userLoc]);

  return (
    <div
      ref={containerRef}
      className="h-[480px] w-full rounded-2xl overflow-hidden border border-[var(--color-border)] isolate relative"
    />
  );
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );
}
