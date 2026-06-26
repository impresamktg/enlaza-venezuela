"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRescueStateAction } from "@/app/actions";
import { timeAgo } from "@/lib/format";
import type { RescueState } from "@/lib/types";

/**
 * Estado en vivo de un rescate, con botones de un toque. Sin login ni token:
 * cualquiera en sitio puede marcar "voy en camino" o "rescatados".
 * Marcar "rescatados" pide confirmación (saca el caso del tablón activo).
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
  const [confirming, setConfirming] = useState(false);

  function set(next: RescueState) {
    startTransition(async () => {
      const { ok } = await setRescueStateAction(postId, next);
      if (ok) router.refresh();
    });
  }

  // Vista terminal: ya rescatados. Solo permite revertir.
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

  const onWay = state === "en_camino";
  const btn =
    "flex-1 rounded-lg text-xs font-semibold px-3 py-2 border transition disabled:opacity-50";

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      {onWay && (
        <p className="text-[11px] font-semibold mb-1.5 text-center" style={{ color: "var(--color-ve-blue)" }}>
          🚑 Equipo en camino
        </p>
      )}
      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-center text-[var(--color-ink)]">
            ¿Confirmas que ya fueron rescatados? Saldrá de la lista activa.
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
              onClick={() => setConfirming(false)}
              disabled={pending}
              className={btn}
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set(onWay ? null : "en_camino")}
            disabled={pending}
            className={btn}
            style={
              onWay
                ? { background: "var(--color-ve-blue)", color: "#fff", borderColor: "var(--color-ve-blue)" }
                : { borderColor: "var(--color-border)", color: "var(--color-ink)" }
            }
          >
            🚑 {onWay ? "En camino" : "Voy en camino"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className={btn}
            style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
          >
            ✅ Rescatados
          </button>
        </div>
      )}
      <p className="text-[10px] text-[var(--color-muted)] mt-1.5 text-center">
        Cualquiera puede actualizar el estado
      </p>
    </div>
  );
}
