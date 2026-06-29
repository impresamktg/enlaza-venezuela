"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CITIES } from "@/lib/data";
import { createPostAction } from "@/app/actions";
import { isValidWhatsApp } from "@/lib/format";
import { saveToken } from "@/lib/manage-tokens";
import SimilarRescues from "./SimilarRescues";
import PhotoUpload from "./PhotoUpload";
import MinorSafetyNotice from "./MinorSafetyNotice";
import type { FormState } from "@/lib/types";

const initialState: FormState = {};

type GeoState = "idle" | "loading" | "on" | "denied" | "error";

const COUNT_OPTIONS = ["1", "2", "3", "4", "5+"] as const;
type CountOption = (typeof COUNT_OPTIONS)[number];

/**
 * Formulario a prueba de pánico para reportar personas atrapadas.
 * Lo imprescindible primero (dónde · ciudad · cuántas · nombre · WhatsApp); lo
 * opcional (zona, detalles) se difiere. Un solo botón grande. Crea una
 * publicación type=need, categoría=rescate, trapped=on.
 */
export default function RescueForm() {
  const [state, formAction, pending] = useActionState(createPostAction, initialState);
  const [where, setWhere] = useState("");
  const [city, setCity] = useState("la-guaira");
  const [count, setCount] = useState<CountOption | null>(null);
  const [countExact, setCountExact] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<GeoState>("idle");

  const zones = useMemo(() => CITIES.find((c) => c.id === city)?.zones ?? [], [city]);

  useEffect(() => {
    if (state.success?.token) saveToken(state.success.id, state.success.token);
  }, [state.success]);

  // Fuente única para people_count: 1–4 → ese número; "5+" → el numérico (o 5).
  const peopleValue =
    count === null ? "" : count === "5+" ? countExact.trim() || "5" : count;

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo("error");
      return;
    }
    setGeo("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeo("on");
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  if (state.success) {
    return (
      <div className="text-center fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-need-soft)] text-2xl">
          🆘
        </div>
        <h2 className="text-xl font-bold">Pedido publicado</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)] max-w-md mx-auto">
          Tu pedido ya es visible. Quien pueda ayudar (voluntarios, maquinaria, brigadas)
          podrá verlo y contactarte por WhatsApp. Enlaza no envía equipos de rescate.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/rescate"
            className="rounded-xl bg-[var(--color-need)] text-white font-semibold px-5 py-3"
          >
            Ver lugares con personas atrapadas
          </Link>
          <a
            href="/reportar"
            className="rounded-xl border border-[var(--color-border)] font-semibold px-5 py-3 text-[var(--color-ink)]"
          >
            Pedir ayuda para otro lugar
          </a>
        </div>
      </div>
    );
  }

  const phoneValid = isValidWhatsApp(phone);
  const phoneError = phoneTouched && phone.trim() !== "" && !phoneValid;
  const canSubmit = where.trim().length >= 5 && phoneValid;
  const fieldClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ve-blue)]/40";
  const labelClass = "block text-sm font-semibold mb-1.5";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Campos fijos / derivados — el servidor exige type, category, title, address */}
      <input type="hidden" name="type" value="need" />
      <input type="hidden" name="category" value="rescate" />
      <input type="hidden" name="title" value={where} />
      <input type="hidden" name="address" value={where} />
      <input type="hidden" name="trapped" value="on" />
      <input type="hidden" name="people_count" value={peopleValue} />
      {coords && (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
        </>
      )}

      {/* 1 · Dónde */}
      <div>
        <label className={labelClass} htmlFor="where">
          ¿Dónde? Edificio, calle y zona{" "}
          <span style={{ color: "var(--color-need-strong)" }} aria-hidden>
            ·
          </span>
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
          autoComplete="street-address"
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geo === "loading"}
          aria-pressed={geo === "on"}
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold min-h-[44px] hover:border-[var(--color-ve-blue)] disabled:opacity-60"
          style={geo === "on" ? { borderColor: "var(--color-offer)", color: "var(--color-offer)" } : undefined}
        >
          📍{" "}
          {geo === "on"
            ? "Ubicación añadida ✓"
            : geo === "loading"
              ? "Ubicando…"
              : "Usar mi ubicación actual"}
        </button>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {geo === "denied" || geo === "error"
            ? "No se pudo obtener tu ubicación. Escribe la dirección lo más exacta posible."
            : "Lo más exacto posible: así quien pueda ayudar sabe adónde ir. Compartir tu ubicación ayuda a ubicarte en el mapa."}
        </p>
      </div>

      <SimilarRescues city={city} query={where} />

      {/* 2 · Ciudad */}
      <div>
        <label className={labelClass} htmlFor="city">
          Ciudad{" "}
          <span style={{ color: "var(--color-need-strong)" }} aria-hidden>
            ·
          </span>
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

      {/* 3 · Cuántas personas — un toque, sin teclado */}
      <div>
        <label className={labelClass}>
          ¿Cuántas personas?{" "}
          <span className="font-normal text-[var(--color-muted)]">(opcional)</span>
        </label>
        <div className="grid grid-cols-5 gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1.5">
          {COUNT_OPTIONS.map((opt) => {
            const active = count === opt;
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={active}
                onClick={() => setCount(active ? null : opt)}
                className="min-h-[44px] rounded-lg text-sm font-semibold transition-colors"
                style={
                  active
                    ? { background: "var(--color-need)", color: "#fff" }
                    : { color: "var(--color-muted)" }
                }
              >
                {opt === "5+" ? "5 o más" : opt}
              </button>
            );
          })}
        </div>
        {count === "5+" && (
          <input
            type="number"
            inputMode="numeric"
            min={5}
            max={9999}
            value={countExact}
            onChange={(e) => setCountExact(e.target.value)}
            className={`${fieldClass} mt-2`}
            placeholder="¿Cuántas exactamente? Ej: 8"
            aria-label="Número exacto de personas"
          />
        )}
      </div>

      {/* 4 · Nombre */}
      <div>
        <label className={labelClass} htmlFor="contact_name">
          Tu nombre o brigada{" "}
          <span style={{ color: "var(--color-need-strong)" }} aria-hidden>
            ·
          </span>
        </label>
        <input
          id="contact_name"
          name="contact_name"
          required
          minLength={2}
          maxLength={60}
          autoComplete="name"
          className={fieldClass}
          placeholder="Nombre o brigada"
        />
      </div>

      {/* 5 · WhatsApp */}
      <div>
        <label className={labelClass} htmlFor="contact_phone">
          Tu WhatsApp{" "}
          <span style={{ color: "var(--color-need-strong)" }} aria-hidden>
            ·
          </span>
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
          className={`${fieldClass} font-[family-name:var(--font-mono)]`}
          style={phoneError ? { borderColor: "var(--color-need)" } : undefined}
          placeholder="0412 555 1234"
        />
        {phoneError && (
          <p className="mt-1 text-xs" style={{ color: "var(--color-need)" }}>
            Revisa el número para que puedan contactarte.
          </p>
        )}
      </div>

      {/* Opcional: zona + detalles diferidos */}
      <details className="border-t border-[var(--color-border)] pt-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--color-ve-blue)]">
          + Añadir detalles (opcional)
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className={labelClass} htmlFor="zone">
              Zona / sector
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
          <div>
            <label className={labelClass} htmlFor="description">
              Detalles
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
          <div>
            <label className={labelClass}>
              Fotos{" "}
              <span className="font-normal text-[var(--color-muted)]">(máx 2)</span>
            </label>
            <PhotoUpload />
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">
              Una foto del edificio o los escombros ayuda a los rescatistas.
            </p>
          </div>
        </div>
      </details>

      <MinorSafetyNotice includeLocation={false} />

      {state.error && (
        <p className="rounded-xl bg-[var(--color-need-soft)] text-[var(--color-need)] text-sm px-4 py-3">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="min-h-[56px] w-full rounded-xl text-white font-bold text-lg transition disabled:opacity-50"
        style={{ background: "var(--color-need-strong)" }}
      >
        {pending ? "Publicando…" : "🆘 Publicar pedido de ayuda"}
      </button>
      <p className="text-xs text-[var(--color-muted)] text-center">
        Tu número será visible para que quien pueda ayudar te contacte. Enlaza no
        coordina rescates ni garantiza respuesta: conecta a la gente.
      </p>
    </form>
  );
}
