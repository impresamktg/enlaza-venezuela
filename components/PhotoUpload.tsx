"use client";

import { useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

const MAX = 2;
const BUCKET = "post-photos";

type Item = { id: string; preview: string; url?: string; status: "uploading" | "done" | "error" };

/** Reduce la imagen a JPEG ~1280px para subir poco peso en redes lentas. */
async function downscale(file: File, max = 1280, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/jpeg", quality),
  );
}

/**
 * Adjunta hasta 2 fotos. Reduce en el navegador y sube directo a Supabase Storage;
 * cada URL pública resultante se envía como input oculto name="photos".
 */
export default function PhotoUpload() {
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    const room = MAX - items.length;
    for (const file of files.slice(0, room)) {
      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      setItems((prev) => [...prev, { id, preview, status: "uploading" }]);
      try {
        const blob = await downscale(file);
        const supabase = getSupabase();
        if (!supabase) throw new Error("storage no disponible");
        const path = `${id}.jpg`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, url, status: "done" } : it)));
      } catch {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "error" } : it)));
      }
    }
  }

  function remove(id: string) {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.preview);
      return prev.filter((x) => x.id !== id);
    });
  }

  return (
    <div>
      {items.map((it) => it.url && <input key={it.id} type="hidden" name="photos" value={it.url} />)}

      <div className="flex flex-wrap items-center gap-2.5">
        {items.map((it) => (
          <div
            key={it.id}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.preview} alt="" className="h-full w-full object-cover" />
            {it.status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                Subiendo…
              </div>
            )}
            {it.status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-need)]/80 text-xs text-white">
                Error
              </div>
            )}
            <button
              type="button"
              onClick={() => remove(it.id)}
              aria-label="Quitar foto"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
            >
              ✕
            </button>
          </div>
        ))}

        {items.length < MAX && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ve-blue)]"
          >
            <span className="text-xl" aria-hidden>
              📷
            </span>
            <span className="text-[11px] font-medium">Añadir</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
