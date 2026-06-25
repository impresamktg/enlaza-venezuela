// Geolocalización para ordenar publicaciones por cercanía.
//
// Privacidad: la ubicación del USUARIO se obtiene en el navegador y solo se usa
// localmente para ordenar; nunca se guarda ni se envía. La ubicación de cada
// PUBLICACIÓN es el centroide aproximado de su ciudad/zona (no coordenadas
// exactas del autor), para no exponer su domicilio.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Centroide aproximado por ciudad (id de lib/data.ts). */
export const CITY_COORDS: Record<string, LatLng> = {
  caracas: { lat: 10.4806, lng: -66.9036 },
  "la-guaira": { lat: 10.6, lng: -66.93 },
  "san-felipe": { lat: 10.34, lng: -68.74 },
  moron: { lat: 10.48, lng: -68.19 },
  valencia: { lat: 10.16, lng: -68.0 },
  maracay: { lat: 10.25, lng: -67.6 },
  maracaibo: { lat: 10.65, lng: -71.64 },
  barquisimeto: { lat: 10.07, lng: -69.32 },
};

/** Centroide aproximado por zona (debe coincidir con los nombres de CITIES.zones). */
export const ZONE_COORDS: Record<string, LatLng> = {
  // Caracas
  Libertador: { lat: 10.5, lng: -66.91 },
  "Chacao - Altamira": { lat: 10.495, lng: -66.845 },
  "Chacao - Los Palos Grandes": { lat: 10.502, lng: -66.84 },
  Baruta: { lat: 10.432, lng: -66.873 },
  "Sucre - Petare": { lat: 10.48, lng: -66.81 },
  "El Hatillo": { lat: 10.42, lng: -66.82 },
  Catia: { lat: 10.51, lng: -66.93 },
  "El Valle": { lat: 10.45, lng: -66.92 },
  "La Candelaria": { lat: 10.503, lng: -66.9 },
  // La Guaira
  Maiquetía: { lat: 10.6, lng: -66.97 },
  "Catia La Mar": { lat: 10.6, lng: -67.03 },
  "La Guaira": { lat: 10.6, lng: -66.93 },
  Macuto: { lat: 10.61, lng: -66.89 },
  Caraballeda: { lat: 10.61, lng: -66.85 },
  // Morón / Puerto Cabello
  Morón: { lat: 10.48, lng: -68.19 },
  "Puerto Cabello": { lat: 10.47, lng: -68.01 },
  Yumare: { lat: 10.62, lng: -68.69 },
  // San Felipe
  "San Felipe": { lat: 10.34, lng: -68.74 },
  Independencia: { lat: 10.31, lng: -68.73 },
  Cocorote: { lat: 10.33, lng: -68.77 },
  // Valencia
  Valencia: { lat: 10.16, lng: -68.0 },
  Naguanagua: { lat: 10.24, lng: -68.01 },
  "San Diego": { lat: 10.23, lng: -67.96 },
  // Maracay
  Maracay: { lat: 10.25, lng: -67.6 },
  Turmero: { lat: 10.23, lng: -67.47 },
  "La Victoria": { lat: 10.23, lng: -67.33 },
};

/** Coordenada de una publicación: zona si se conoce, si no la ciudad. */
export function postCoords(city: string, zone: string | null): LatLng | null {
  if (zone && ZONE_COORDS[zone]) return ZONE_COORDS[zone];
  return CITY_COORDS[city] ?? null;
}

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia legible en español. */
export function formatDistance(km: number): string {
  if (km < 1) return `a ${Math.round(km * 1000)} m`;
  if (km < 10) return `a ${km.toFixed(1)} km`;
  return `a ${Math.round(km)} km`;
}
