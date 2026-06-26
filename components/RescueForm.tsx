"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CITIES } from "@/lib/data";
import { createPostAction } from "@/app/actions";
import { isValidWhatsApp } from "@/lib/format";
import { saveToken } from "@/lib/manage-tokens";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

/**
 * Formulario corto y directo para reportar personas atrapadas / pedir rescate.
 * Pocos campos, un solo botón. Crea una publicación type=need, categoría=rescate.
 */
export default function RescueForm() {
  const [state, formAction, pending] = useActionState(createPostAction, initialState);
  const [where, setWhere] = useState("");
  const [city, setCity] = useState("la-guaira");
  const [trapped, setTrapped] = useState(true);
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  const zones = useMemo(() => CITIES.find((c) => c.id === city)?.zones ?? [], [city]);

  useEffect(() => {
    if (state.success?.token) saveToken(state.success.id, state.success.token);
  }, [state.success]);

  if (state.success) {
    return (
      <div className="text-center fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-need-soft)] text-2xl">
          🆘
        </div>
        <h2 className="text-xl font-bold">Reporte publicado</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)] max-w-md mx-auto">
          Ya aparece en el mapa de rescate. Rescatistas y maquinaria podrán verlo y
          contactarte por WhatsApp.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/rescate"
            className="rounded-xl bg-[var(--color-need)] text-white font-semibold px-5 py-3"
          >
            Ver mapa de rescate
          </Link>
          <a
            href="/reportar"
            className="rounded-xl border border-[var(--color-border)] font-semibold px-5 py-3 text-[var(--color-ink)]"
          >
            Reportar otro
          </a>
        </div>
      </div>
    );
  }

  const phoneValid = isValidWhatsApp(phone);
  const phoneError = phoneTouched && phone.trim() !== "" && !phoneValid;
  const fieldClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-need)]/30";
  const labelClass = "block text-sm font-semibold mb-1.5";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* type/category fijos para este formulario */}
      <input type="hidden" name="type" value="need" />
      <input type="hidden" name="category" value="rescate" />
      <input type="hidden" name="title" value={where} />
      <input type="hidden" name="address" value={where} />
      {trapped && <input type="hidden" name="trapped" value="on" />}

      {/* Dónde */}
      <div>
        <label className={labelClass} htmlFor="where">
          ¿Dónde? Edificio, sector o familia
        </label>
        <input
          id="where"
          required
          minLength={5}
          maxLength={120}
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          className={fieldClass}
          placeholder="Ej: Edificio Costa Brava, Los Corales, Caraballeda"
        />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Lo más exacto posible: así los rescatistas saben adónde ir.
        </p>
      </div>

      {/* Ciudad + zona */}
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
            Zona / sector <span className="font-normal text-[var(--color-muted)]">(opcional)</span>
          </label>
          <input
            id="zone"
            name="zone"
            list="zones"
            className={fieldClass}
            placeholder="Ej: Caraballeda, Tanaguarena…"
          />
          <datalist id="zones">
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Atrapados + nº personas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <button
          type="button"
          onClick={() => setTrapped((v) => !v)}
          className="flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors"
          style={{
            borderColor: trapped ? "var(--color-need)" : "var(--color-border)",
            background: trapped ? "var(--color-need-soft)" : "var(--color-surface)",
          }}
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md text-sm"
            style={{
              background: trapped ? "var(--color-need)" : "var(--color-bg)",
              color: "#fff",
            }}
          >
            {trapped ? "✓" : ""}
          </span>
          <span className="text-sm font-semibold">🆘 Hay personas atrapadas</span>
        </button>
        <div>
          <label className={labelClass} htmlFor="people_count">
            ¿Cuántas personas? <span className="font-normal text-[var(--color-muted)]">(opcional)</span>
          </label>
          <input
            id="people_count"
            name="people_count"
            type="number"
            inputMode="numeric"
            min={1}
            max={9999}
            className={fieldClass}
            placeholder="Ej: 3"
          />
        </div>
      </div>

      {/* Detalles */}
      <div>
        <label className={labelClass} htmlFor="description">
          Detalles <span className="font-normal text-[var(--color-muted)]">(opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          className={fieldClass}
          placeholder="Señales de vida, piso, qué se necesita (maquinaria, herramientas)…"
        />
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
            placeholder="Nombre o brigada"
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
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneError}
            className={fieldClass}
            style={phoneError ? { borderColor: "var(--color-need)" } : undefined}
            placeholder="Ej: 0412 555 1234"
          />
          {phoneError && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-need)" }}>
              Revisa el número para que puedan contactarte.
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <p className="rounded-xl bg-[var(--color-need-soft)] text-[var(--color-need)] text-sm px-4 py-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || where.trim().length < 5 || !phoneValid}
        className="rounded-xl bg-[var(--color-need)] text-white font-bold py-4 text-lg transition disabled:opacity-50"
      >
        {pending ? "Publicando…" : "🆘 Publicar reporte de rescate"}
      </button>
      <p className="text-xs text-[var(--color-muted)] text-center">
        Tu número será visible para que rescatistas te contacten. En emergencia, llama
        también al <strong>171</strong>.
      </p>
    </form>
  );
}
