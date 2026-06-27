"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza la(s) foto(s) de una publicación y permite ampliarlas en un visor a
 * pantalla completa (toque/clic). Dos disposiciones:
 *  - "thumb": miniatura cuadrada (tablón).
 *  - "grid":  imagen 16:10 (una) o dos cuadradas (detalle).
 * El visor es propio (sin dependencias): fondo oscuro, cerrar con ✕/fondo/Esc,
 * y navegación con flechas cuando hay más de una foto.
 */
export default function PhotoGallery({
  photos,
  variant,
}: {
  photos: string[];
  variant: "thumb" | "grid";
}) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null;
  const multiple = photos.length > 1;

  const close = useCallback(() => setIndex(null), []);
  const go = useCallback(
    (delta: number) =>
      setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  // Teclado + bloqueo del scroll del fondo mientras el visor está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, go]);

  if (photos.length === 0) return null;

  const overlay =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Foto ampliada"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          >
            {/* Fondo: cerrar al tocar fuera de la imagen. */}
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute inset-0 cursor-zoom-out"
            />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[index]}
              alt=""
              className="relative z-10 max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            />

            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white transition hover:bg-white/25"
            >
              ✕
            </button>

            {multiple && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white transition hover:bg-white/25"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Foto siguiente"
                  className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl leading-none text-white transition hover:bg-white/25"
                >
                  ›
                </button>
                <span className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white">
                  {index + 1} / {photos.length}
                </span>
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  if (variant === "thumb") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIndex(0)}
          aria-label="Ampliar foto"
          className="relative shrink-0 self-start"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[0]}
            alt=""
            loading="lazy"
            className="h-[72px] w-[72px] rounded-xl border border-[var(--color-border)] object-cover transition hover:brightness-95"
          />
          {multiple && (
            <span className="absolute bottom-1 right-1 rounded-md bg-black/65 px-1.5 text-[10px] font-semibold text-white">
              +{photos.length - 1}
            </span>
          )}
        </button>
        {overlay}
      </>
    );
  }

  return (
    <>
      <div
        className={`grid gap-0.5 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] ${
          photos.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {photos.slice(0, 2).map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label="Ampliar foto"
            className="group/photo relative block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="lazy"
              className={`w-full bg-[var(--color-bg)] object-cover transition group-hover/photo:brightness-95 ${
                photos.length === 1 ? "aspect-[16/10]" : "aspect-square"
              }`}
            />
          </button>
        ))}
      </div>
      {overlay}
    </>
  );
}
