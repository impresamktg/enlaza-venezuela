"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // En desarrollo no usamos service worker: serviría chunks cacheados mientras
    // editas (los assets de dev no llevan hash). Además, desinstala cualquier SW
    // que quedara de una sesión anterior para no ver versiones viejas.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    let reloaded = false;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Cuando una versión nueva queda "installed" y ya había un SW
        // controlando la página, es un despliegue nuevo → recarga una vez para
        // tomar la UI fresca (en primera instalación no hay controller, no recarga).
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller &&
              !reloaded
            ) {
              reloaded = true;
              window.location.reload();
            }
          });
        });

        // Busca actualizaciones al cargar y cada vez que la pestaña vuelve al frente.
        reg.update().catch(() => {});
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      } catch {
        /* registro fallido: la app sigue funcionando sin SW */
      }
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
