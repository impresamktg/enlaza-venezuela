"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mapsSearchHref } from "@/lib/format";
import { SITIO_META, type Sitio } from "@/lib/sitios";

const CARACAS: [number, number] = [10.4806, -66.9036];

/** Mapa Leaflet de sitios de ayuda. Cada sitio trae lat/lng reales de la fuente,
 *  así que pintamos su coordenada directa (sin centroides). Marcador coloreado
 *  por tipo; popup con estado, municipio, insumos y "Cómo llegar". Sin WhatsApp:
 *  los sitios no tienen contacto telefónico. */
export default function SitiosMap({ sitios }: { sitios: Sitio[] }) {
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

    const withCoords = sitios.filter((s) => s.coords);
    const sig = withCoords.map((s) => `${s.id}:${s.coords!.lat}:${s.coords!.lng}`).join("|");
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    layer.clearLayers();
    const bounds: [number, number][] = [];

    for (const s of withCoords) {
      const { lat, lng } = s.coords!;
      const meta = SITIO_META[s.type];
      const maps = mapsSearchHref([`${lat},${lng}`]);
      const status = s.status
        ? `<div style="font-size:12px;color:#78716c;margin-top:2px">${esc(s.status)}</div>`
        : "";
      const muni = s.municipio
        ? `<div style="font-size:12px;color:#78716c;margin-top:2px">📍 ${esc(s.municipio)}</div>`
        : "";
      const needs = s.needs.length
        ? `<div style="font-size:12px;color:#78716c;margin-top:4px">Necesita: ${esc(s.needs.slice(0, 8).join(", "))}</div>`
        : "";
      const marker = L.circleMarker([lat, lng], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: meta.color,
        fillOpacity: 1,
      });
      marker.bindPopup(
        `<div style="min-width:190px;font-family:system-ui,sans-serif">
          <div style="font-weight:700;font-size:12px;color:${meta.color}">${esc(meta.icon + " " + meta.label.toUpperCase())}</div>
          <div style="font-weight:600;margin:2px 0;color:#1c1917">${esc(s.name)}</div>
          ${status}${muni}${needs}
          <a href="${maps}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin-top:8px;border:1px solid #d6d3d1;color:#1c1917;font-weight:600;padding:7px;border-radius:8px;text-decoration:none">🧭 Cómo llegar</a>
        </div>`,
      );
      marker.addTo(layer);
      bounds.push([lat, lng]);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else {
      map.setView(CARACAS, 11);
    }
  }, [sitios]);

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
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
