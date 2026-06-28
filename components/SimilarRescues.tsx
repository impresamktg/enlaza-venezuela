"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { findSimilarAction, corroboratePostAction } from "@/app/actions";
import { isValidWhatsApp } from "@/lib/format";
import type { FormState, SimilarRescue } from "@/lib/types";

const initialState: FormState = {};

/**
 * Aviso anti-duplicados, no bloqueante. Tras escribir la ubicación, busca rescates
 * activos parecidos en la misma ciudad; tocar uno corrobora ese reporte (suma tu
 * contacto) en vez de crear una tarjeta repetida. Se usa en /reportar y /publicar.
 */
export default function SimilarRescues({ city, query }: { city: string; query: string }) {
  const [matches, setMatches] = useState<SimilarRescue[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [picked, setPicked] = useState<SimilarRescue | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, formAction, pending] = useActionState(corroboratePostAction, initialState);

  useEffect(() => {
    if (dismissed || !city || query.trim().length < 4) {
      setMatches([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setMatches(await findSimilarAction(city, query));
      } catch {
        setMatches([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [city, query, dismissed]);

  if (state.success) {
    return (
      <div className="rounded-xl border border-[var(--color-offer)] bg-[var(--color-offer-soft)] p-4 text-sm fade-in">
        <p className="font-semibold text-[var(--color-offer)]">✅ Reporte confirmado</p>
        <p className="mt-1 text-[var(--color-ink)]">
          Quien pueda ayudar verá que más personas reportan este lugar y tu WhatsApp
          quedó añadido.
        </p>
        <Link
          href="/rescate"
          className="mt-2 inline-block font-semibold text-[var(--color-ve-blue)]"
        >
          Ver lugares con personas atrapadas →
        </Link>
      </div>
    );
  }

  if (dismissed || matches.length === 0) return null;

  return (
    <div
      className="rounded-xl border-2 bg-[var(--color-need-soft)] p-3.5 fade-in"
      style={{ borderColor: "color-mix(in srgb, var(--color-need) 40%, transparent)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: "var(--color-need)" }}>
          ¿Ya está reportado este lugar?
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-xs text-[var(--color-muted)] underline"
        >
          No, es otro ✕
        </button>
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Toca el tuyo para confirmarlo (ayuda a priorizar) en vez de crear un reporte repetido.
      </p>

      <ul className="mt-2.5 flex flex-col gap-1.5">
        {matches.map((m) => {
          const active = picked?.id === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setPicked(active ? null : m)}
                className="w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm transition-colors"
                style={{ borderColor: active ? "var(--color-need)" : "var(--color-border)" }}
              >
                <span className="font-semibold text-[var(--color-ink)]">{m.title}</span>
                {m.corroboration_count > 0 && (
                  <span className="ml-1 text-xs" style={{ color: "var(--color-need)" }}>
                    · {m.corroboration_count + 1} reportes
                  </span>
                )}
                {m.zone && (
                  <span className="block text-xs text-[var(--color-muted)]">{m.zone}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {picked && (
        <form
          action={formAction}
          className="mt-3 flex flex-col gap-2 border-t pt-3"
          style={{ borderColor: "color-mix(in srgb, var(--color-need) 20%, transparent)" }}
        >
          <input type="hidden" name="canonical_id" value={picked.id} />
          <input type="hidden" name="note" value={query} />
          <p className="text-xs font-semibold text-[var(--color-ink)]">
            Confirmar reporte en: {picked.title}
          </p>
          <input
            name="contact_name"
            required
            minLength={2}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre o brigada"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
          />
          <input
            name="contact_phone"
            type="tel"
            inputMode="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Tu WhatsApp"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-[family-name:var(--font-mono)]"
          />
          {state.error && (
            <p className="text-xs" style={{ color: "var(--color-need)" }}>
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || name.trim().length < 2 || !isValidWhatsApp(phone)}
            className="min-h-[44px] rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--color-need)" }}
          >
            {pending ? "Confirmando…" : "Confirmar este reporte"}
          </button>
        </form>
      )}
    </div>
  );
}
