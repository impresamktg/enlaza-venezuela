"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolvePostAction, deletePostAction } from "@/app/actions";
import { removeToken } from "@/lib/manage-tokens";

/**
 * Controles para que el autor de una publicación la marque como resuelta o la
 * elimine. Requiere el token secreto de gestión.
 *
 * variant "card": compacto, se muestra dentro de la tarjeta en el tablón.
 * variant "page": grande, para la página /gestionar.
 */
export default function ManagePost({
  postId,
  token,
  variant = "card",
}: {
  postId: string;
  token: string;
  variant?: "card" | "page";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onResolve() {
    setError(null);
    startTransition(async () => {
      const { ok } = await resolvePostAction(postId, token);
      if (ok) {
        removeToken(postId);
        router.refresh();
      } else {
        setError("No se pudo actualizar. Verifica el enlace.");
      }
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const { ok } = await deletePostAction(postId, token);
      if (ok) {
        removeToken(postId);
        router.refresh();
      } else {
        setError("No se pudo eliminar. Verifica el enlace.");
      }
    });
  }

  const btn =
    "rounded-lg text-xs font-semibold px-3 py-2 transition disabled:opacity-50";

  return (
    <div className={variant === "page" ? "flex flex-col gap-3" : "mt-2"}>
      <p className="text-[11px] text-[var(--color-muted)] mb-1.5">
        Tu publicación (solo tú ves esto)
      </p>
      {!confirming ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onResolve}
            disabled={pending}
            className={`${btn} flex-1 bg-[var(--color-offer-soft)] text-[var(--color-offer)] hover:brightness-95`}
          >
            {pending ? "…" : "✓ Marcar resuelto"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className={`${btn} flex-1 bg-[var(--color-need-soft)] text-[var(--color-need)] hover:brightness-95`}
          >
            🗑 Eliminar
          </button>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <span className="text-xs text-[var(--color-ink)]">¿Eliminar?</span>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className={`${btn} bg-[var(--color-need)] text-white`}
          >
            {pending ? "…" : "Sí, eliminar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className={`${btn} bg-[var(--color-bg)] text-[var(--color-muted)]`}
          >
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-[var(--color-need)] mt-1.5">{error}</p>}
    </div>
  );
}
