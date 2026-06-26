"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRescueStateAction } from "@/app/actions";
import { timeAgo } from "@/lib/format";
import type { RescueState } from "@/lib/types";

/**
 * Estado en vivo de un rescate, con botones de un toque. Sin login ni token:
 * cualquiera en sitio puede actualizarlo.
 *
 * Al cerrar se distingue:
 *  - "Rescatados": se rescató a personas → cuenta en el registro de rescatados.
 *  - "Resuelto": la solicitud fue atendida (p. ej. llegó la maquinaria) sin que
 *    eso signifique personas rescatadas → no cuenta como rescate.
 * Ambos sacan la publicación del tablón activo y piden confirmación.
 */
export default function RescueStatus({
  postId,
  state,
  rescuedAt,
}: {
  postId: string;
  state: RescueState;
  rescuedAt?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<"rescatados" | "resuelto" | null>(null);

  function set(next: RescueState) {
    startTransition(async () => {
      const { ok } = await setRescueStateAction(postId, next);
      if (ok) router.refresh();
    });
  }

  const btn =
    "flex-1 rounded-lg text-xs font-semibold px-3 py-2 border transition disabled:opacity-50";

  // Vista terminal: rescatados (personas) — solo permite revertir.
  if (state === "rescatados") {
    return (
      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <p className="text-[11px] font-semibold mb-2 text-center" style={{ color: "var(--color-offer)" }}>
          ✅ Rescatados{rescuedAt ? ` · ${timeAgo(rescuedAt)}` : ""}
        </p>
        <button
          type="button"
          onClick={() => set(null)}
          disabled={pending}
          className="w-full rounded-lg border border-[var(--color-border)] text-xs font-semibold px-3 py-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition disabled:opacity-50"
        >
          ↩ Volver a activo
        </button>
        <p className="text-[10px] text-[var(--color-muted)] mt-1.5 text-center">
          ¿Se marcó por error? Vuélvelo a la lista de rescate.
        </p>
      </div>
    );
  }

  // Vista terminal: resuelto (solicitud atendida, sin rescate de personas).
  if (state === "resuelto") {
    return (
      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <p className="text-[11px] font-semibold mb-2 text-center text-[var(--color-ink)]">
          ✓ Solicitud resuelta
        </p>
        <button
          type="button"
          onClick={() => set(null)}
          disabled={pending}
          className="w-full rounded-lg border border-[var(--color-border)] text-xs font-semibold px-3 py-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition disabled:opacity-50"
        >
          ↩ Volver a activo
        </button>
      </div>
    );
  }

  const onWay = state === "en_camino";

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      {onWay && (
        <p className="text-[11px] font-semibold mb-1.5 text-center" style={{ color: "var(--color-ve-blue)" }}>
          🚑 Equipo en camino
        </p>
      )}

      {confirming === "rescatados" ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-center text-[var(--color-ink)]">
            ¿Confirmas que ya rescataron a las personas? Saldrá de la lista activa.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("rescatados")}
              disabled={pending}
              className={btn}
              style={{ background: "var(--color-offer)", color: "#fff", borderColor: "var(--color-offer)" }}
            >
              ✅ Sí, rescatados
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={pending}
              className={btn}
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : confirming === "resuelto" ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-center text-[var(--color-ink)]">
            ¿La solicitud ya fue atendida? (sin rescate de personas). Saldrá de la lista activa.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("resuelto")}
              disabled={pending}
              className={btn}
              style={{ background: "var(--color-ink)", color: "#fff", borderColor: "var(--color-ink)" }}
            >
              ✓ Sí, resuelto
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={pending}
              className={btn}
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => set(onWay ? null : "en_camino")}
            disabled={pending}
            className="w-full rounded-lg text-xs font-semibold px-3 py-2 border transition disabled:opacity-50"
            style={
              onWay
                ? { background: "var(--color-ve-blue)", color: "#fff", borderColor: "var(--color-ve-blue)" }
                : { borderColor: "var(--color-border)", color: "var(--color-ink)" }
            }
          >
            🚑 {onWay ? "En camino" : "Voy en camino"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming("rescatados")}
              disabled={pending}
              className={btn}
              style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
            >
              ✅ Rescatados
            </button>
            <button
              type="button"
              onClick={() => setConfirming("resuelto")}
              disabled={pending}
              className={btn}
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
            >
              ✓ Resuelto
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[var(--color-muted)] mt-1.5 text-center">
        Rescatados = personas. Resuelto = solicitud atendida. Cualquiera puede actualizar.
      </p>
    </div>
  );
}
