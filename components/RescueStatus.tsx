"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRescueStateAction } from "@/app/actions";
import { timeAgo } from "@/lib/format";
import type { RescueState } from "@/lib/types";

/**
 * Estado honesto de una solicitud con personas atrapadas. Enlaza NO coordina
 * rescates ni envía equipos: solo hace visible el pedido para que quien pueda
 * ayudar contacte. Por eso aquí no hay "equipo en camino" ni promesa de respuesta;
 * únicamente un control para cerrar la solicitud cuando ya no aplica.
 * Sin login ni token: cualquiera en sitio puede actualizarlo.
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

  function set(next: RescueState) {
    startTransition(async () => {
      const { ok } = await setRescueStateAction(postId, next);
      if (ok) router.refresh();
    });
  }

  const revertBtn = (
    <button
      type="button"
      onClick={() => set(null)}
      disabled={pending}
      className="w-full rounded-lg border border-[var(--color-border)] text-xs font-semibold px-3 py-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition disabled:opacity-50"
    >
      ↩ Volver a activo
    </button>
  );

  // Estados terminales (datos existentes): la solicitud salió del tablón activo.
  if (state === "rescatados") {
    return (
      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <p
          className="text-[11px] font-semibold mb-2 text-center"
          style={{ color: "var(--color-offer)" }}
        >
          ✅ Personas rescatadas{rescuedAt ? ` · ${timeAgo(rescuedAt)}` : ""}
        </p>
        {revertBtn}
      </div>
    );
  }
  if (state === "resuelto") {
    return (
      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <p className="text-[11px] font-semibold mb-2 text-center text-[var(--color-ink)]">
          ✓ Solicitud cerrada
        </p>
        {revertBtn}
      </div>
    );
  }

  // Estado activo (incluye datos antiguos en "en_camino"): un solo control honesto.
  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <button
        type="button"
        onClick={() => set("resuelto")}
        disabled={pending}
        className="w-full rounded-lg text-xs font-semibold px-3 py-2 border transition disabled:opacity-50"
        style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
      >
        ✓ Marcar como resuelto / ya no aplica
      </button>
      <p className="text-[10px] text-[var(--color-muted)] mt-1.5 text-center">
        Enlaza no envía equipos de rescate. Esto solo hace visible el pedido para que
        quien pueda ayudar te contacte. Cualquiera puede cerrarlo cuando ya no aplique.
      </p>
    </div>
  );
}
