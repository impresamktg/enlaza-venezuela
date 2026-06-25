"use client";

import { useActionState, useMemo, useState } from "react";
import { CATEGORIES, CITIES } from "@/lib/data";
import type { FormState, PostType } from "@/lib/types";
import { createPostAction } from "@/app/actions";

const initialState: FormState = {};

export default function PostForm({ defaultType = "need" }: { defaultType?: PostType }) {
  const [state, formAction, pending] = useActionState(createPostAction, initialState);
  const [type, setType] = useState<PostType>(defaultType);
  const [category, setCategory] = useState<string>("");
  const [city, setCity] = useState<string>("caracas");

  const isNeed = type === "need";
  const accent = isNeed ? "var(--color-need)" : "var(--color-offer)";

  const zones = useMemo(() => CITIES.find((c) => c.id === city)?.zones ?? [], [city]);

  const fieldClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ve-blue)]/30";
  const labelClass = "block text-sm font-medium mb-1.5";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="category" value={category} />

      {/* Tipo */}
      <fieldset>
        <legend className={labelClass}>¿Qué quieres hacer?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["need", "offer"] as PostType[]).map((t) => {
            const active = type === t;
            const c = t === "need" ? "var(--color-need)" : "var(--color-offer)";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="rounded-2xl border-2 p-4 text-left transition-all"
                style={{
                  borderColor: active ? c : "var(--color-border)",
                  background: active
                    ? t === "need"
                      ? "var(--color-need-soft)"
                      : "var(--color-offer-soft)"
                    : "var(--color-surface)",
                }}
              >
                <div className="text-2xl mb-1" aria-hidden>
                  {t === "need" ? "🆘" : "🙌"}
                </div>
                <div className="font-semibold" style={{ color: active ? c : undefined }}>
                  {t === "need" ? "Necesito ayuda" : "Ofrezco ayuda"}
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-0.5">
                  {t === "need"
                    ? "Pedir un recurso o servicio"
                    : "Tengo algo para aportar"}
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Categoría */}
      <fieldset>
        <legend className={labelClass}>Categoría</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                title={c.hint}
                className="rounded-xl border-2 px-3 py-3 text-center transition-all"
                style={{
                  borderColor: active ? accent : "var(--color-border)",
                  background: active ? "var(--color-bg)" : "var(--color-surface)",
                }}
              >
                <div className="text-xl" aria-hidden>
                  {c.icon}
                </div>
                <div className="text-xs font-medium mt-1 leading-tight">{c.label}</div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Título */}
      <div>
        <label className={labelClass} htmlFor="title">
          Título breve
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={120}
          className={fieldClass}
          placeholder={
            isNeed
              ? "Ej: Familia de 5 necesita refugio en Altamira"
              : "Ej: Camión disponible para traslados en Caracas"
          }
        />
      </div>

      {/* Descripción */}
      <div>
        <label className={labelClass} htmlFor="description">
          Detalles <span className="text-[var(--color-muted)] font-normal">(opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          className={fieldClass}
          placeholder="Describe la situación, horarios, cantidades, condiciones, etc."
        />
      </div>

      {/* Ubicación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="city">
            Ciudad
          </label>
          <select
            id="city"
            name="city"
            className={fieldClass}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="zone">
            Zona / municipio{" "}
            <span className="text-[var(--color-muted)] font-normal">(opcional)</span>
          </label>
          <input
            id="zone"
            name="zone"
            list="zones"
            className={fieldClass}
            placeholder="Ej: Chacao, Petare, Maiquetía…"
          />
          <datalist id="zones">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="contact_name">
            Tu nombre
          </label>
          <input
            id="contact_name"
            name="contact_name"
            required
            minLength={2}
            maxLength={60}
            className={fieldClass}
            placeholder="Nombre o del grupo/brigada"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="contact_phone">
            WhatsApp
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            required
            className={fieldClass}
            placeholder="Ej: 0412 555 1234"
          />
        </div>
      </div>

      <div className="sm:w-1/2">
        <label className={labelClass} htmlFor="people_count">
          Nº de personas{" "}
          <span className="text-[var(--color-muted)] font-normal">(opcional)</span>
        </label>
        <input
          id="people_count"
          name="people_count"
          type="number"
          min={1}
          className={fieldClass}
          placeholder={isNeed ? "Personas afectadas" : "Capacidad / cupos"}
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-[var(--color-need-soft)] text-[var(--color-need)] text-sm px-4 py-3">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={pending || !category}
          className="rounded-xl text-white font-semibold py-3.5 transition disabled:opacity-50"
          style={{ background: accent }}
        >
          {pending ? "Publicando…" : "Publicar"}
        </button>
        <p className="text-xs text-[var(--color-muted)] text-center">
          Tu número de WhatsApp será visible para que otras personas te contacten. No
          compartas datos sensibles. Verifica siempre con quién hablas.
        </p>
      </div>
    </form>
  );
}
