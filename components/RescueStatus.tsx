"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRescueStateAction } from "@/app/actions";
import type { RescueState } from "@/lib/types";

/**
 * Estado en vivo de un rescate, con botones de un toque. Sin login ni token:
 * cualquiera en sitio puede marcar "voy en camino" o "rescatados".
 */
export default function RescueStatus({
  postId,
  state,
}: {
  postId: string;
  state: RescueState;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: NonNullable<RescueState>) {
    const value: RescueState = state === next ? null : next; // tocar el activo lo deshace
    startTransition(async () => {
      const { ok } = await setRescueStateAction(postId, value);
      if (ok) router.refresh();
    });
  }

  const onWay = state === "en_camino";
  const rescued = state === "rescatados";
  const btn =
    "flex-1 rounded-lg text-xs font-semibold px-3 py-2 border transition disabled:opacity-50";

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      {state && (
        <p
          className="text-[11px] font-semibold mb-1.5 text-center"
          style={{ color: rescued ? "var(--color-offer)" : "var(--color-ve-blue)" }}
        >
          {rescued ? "✅ Marcado como rescatados" : "🚑 Equipo en camino"}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => set("en_camino")}
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
          onClick={() => set("rescatados")}
          disabled={pending}
          className={btn}
          style={
            rescued
              ? { background: "var(--color-offer)", color: "#fff", borderColor: "var(--color-offer)" }
              : { borderColor: "var(--color-border)", color: "var(--color-ink)" }
          }
        >
          ✅ Rescatados
        </button>
      </div>
      <p className="text-[10px] text-[var(--color-muted)] mt-1.5 text-center">
        Cualquiera puede actualizar el estado
      </p>
    </div>
  );
}
