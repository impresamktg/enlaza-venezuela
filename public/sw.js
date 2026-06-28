// Service worker de Enlaza Venezuela.
//
// La versión se sella en cada build (scripts/stamp-sw.mjs, vía `prebuild`): así
// cada despliegue genera bytes distintos, el navegador detecta el SW nuevo,
// reinstala y `activate` borra las cachés anteriores. Sin esto, los usuarios con
// la PWA instalada seguirían viendo la versión vieja tras un deploy.
//
// Estrategia:
//  - Navegaciones (HTML): network-first → online siempre fresco; offline sirve
//    la copia en caché o, si no, /recursos (números de emergencia) y /offline.
//  - /_next/static (con hash, inmutables): cache-first (rápido y estable).
//  - Otros estáticos propios (imágenes, fuentes, css/js sin hash): stale-while-revalidate.
//  - Tiles del mapa y Supabase (otros orígenes): no se interceptan.
//
// En desarrollo no se registra (ver ServiceWorkerRegister), por eso aquí solo
// vive la lógica de producción.

const VERSION = "37e2f59-1782677685019"; // ← sellado en build por scripts/stamp-sw.mjs
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

// En local (dev) el SW se auto-desinstala y no cachea nada: los assets de dev no
// llevan hash y se servirían viejos al editar. Defensa por si alguna vez se probó
// un build de producción en localhost y quedó un SW registrado.
const IS_DEV = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

self.addEventListener("install", (event) => {
  if (IS_DEV) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  if (IS_DEV) {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        await self.clients.claim();
      })(),
    );
    return;
  }
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
  if (IS_DEV) return; // dev: nunca interceptar
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // mapa/Supabase: dejar pasar

  // Navegaciones: red primero (online siempre fresco); offline → caché/fallbacks.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(
          async () =>
            (await caches.match(req)) ||
            (await caches.match("/recursos")) ||
            (await caches.match("/offline")) ||
            Response.error(),
        ),
    );
    return;
  }

  // Recursos con hash de Next: inmutables → cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Otros estáticos propios: stale-while-revalidate.
  const isStatic = /\.(png|jpg|jpeg|svg|webp|gif|ico|css|js|woff2?)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
