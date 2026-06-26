"use client";

import { useState } from "react";

/**
 * Compartir una publicación. Intenta compartir una IMAGEN vertical (story card)
 * para que la hoja de compartir del móvil ofrezca "Añadir a tu historia/estado"
 * en Instagram, Facebook o WhatsApp. Si no se puede, comparte el enlace o lo copia.
 * Además ofrece descargar la imagen para subirla a la historia manualmente.
 */
export default function SharePost({
  postId,
  title,
}: {
  postId: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const storyUrl = `/post/${postId}/story`;

  async function fetchStoryFile(): Promise<File | null> {
    try {
      const res = await fetch(storyUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], "enlaza-venezuela.png", {
        type: blob.type || "image/png",
      });
    } catch {
      return null;
    }
  }

  async function share() {
    if (busy) return;
    setBusy(true);
    const url = `${window.location.origin}/post/${postId}`;
    const text = `${title} — Enlaza Venezuela`;
    try {
      // 1) Compartir la imagen (permite elegir Historia/Estado en redes).
      const file = await fetchStoryFile();
      if (
        file &&
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], text, url });
          return;
        } catch {
          return; // el usuario canceló
        }
      }

      // 2) Compartir el enlace.
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "Enlaza Venezuela", text, url });
          return;
        } catch {
          return;
        }
      }

      // 3) Copiar el enlace.
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-60"
      >
        {busy ? "Preparando…" : copied ? "✓ Enlace copiado" : "↗ Compartir"}
      </button>
      <a
        href={storyUrl}
        download="enlaza-venezuela.png"
        className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
      >
        ⬇ Imagen para historia
      </a>
    </div>
  );
}
