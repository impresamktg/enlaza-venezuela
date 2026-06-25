// Service worker de Enlaza Venezuela.
// Estrategia:
//  - Navegaciones (páginas): network-first; sin conexión, sirve la versión en
//    caché o, si no, /recursos (números de emergencia) y por último /offline.
//  - Estáticos (_next, imágenes, css, js, fuentes): stale-while-revalidate.
//  - Tiles del mapa y Supabase (otros orígenes): no se interceptan.

const VERSION = "v1";
const CACHE = `enlaza-${VERSION}`;
const PRECACHE = [
  "/",
  "/recursos",
  "/offline",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // mapa/Supabase: dejar pasar

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          return (
            (await caches.match(req)) ||
            (await caches.match("/recursos")) ||
            (await caches.match("/offline"))
          );
        }),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/") ||
    /\.(png|jpg|jpeg|svg|webp|gif|ico|css|js|woff2?)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
