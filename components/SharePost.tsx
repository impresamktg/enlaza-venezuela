"use client";

import { useState } from "react";

/** Botón para compartir una publicación (Web Share API, con copia de respaldo). */
export default function SharePost({
  postId,
  title,
}: {
  postId: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/post/${postId}`;
    const text = `${title} — Enlaza Venezuela`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Enlaza Venezuela", text, url });
        return;
      } catch {
        return; // el usuario canceló
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
    >
      {copied ? "✓ Enlace copiado" : "↗ Compartir"}
    </button>
  );
}
