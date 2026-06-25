"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CITIES } from "@/lib/data";
import type { FormState, PostType } from "@/lib/types";
import { createPostAction } from "@/app/actions";
import { isValidWhatsApp } from "@/lib/format";
import { saveToken } from "@/lib/manage-tokens";

const initialState: FormState = {};

export default function PostForm({
  defaultType = "need",
  defaultCategory = "",
}: {
  defaultType?: PostType;
  defaultCategory?: string;
}) {
  const [state, formAction, pending] = useActionState(createPostAction, initialState);
  const [type, setType] = useState<PostType>(defaultType);
  const [category, setCategory] = useState<string>(
    CATEGORIES.some((c) => c.id === defaultCategory) ? defaultCategory : "",
  );
  const [city, setCity] = useState<string>("caracas");
  const [phone, setPhone] = useState<string>("");
  const [phoneTouched, setPhoneTouched] = useState<boolean>(false);
  const [titleLen, setTitleLen] = useState<number>(0);
  const [descLen, setDescLen] = useState<number>(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<
    "idle" | "loading" | "on" | "denied" | "error"
  >("idle");
  const zones = useMemo(() => CITIES.find((c) => c.id === city)?.zones ?? [], [city]);

  // Al publicar con éxito, guarda el token en este navegador para poder gestionar.
  useEffect(() => {
    if (state.success?.token) {
      saveToken(state.success.id, state.success.token);
    }
  }, [state.success]);

  // IMPORTANTE: el return anticipado debe ir DESPUÉS de todos los hooks.
  if (state.success) {
    return <SuccessPanel success={state.success} />;
  }

  const isNeed = type === "need";
  const accent = isNeed ? "var(--color-need)" : "var(--color-offer)";
  const phoneValid = isValidWhatsApp(phone);
  const phoneError = phoneTouched && phone.trim() !== "" && !phoneValid;

  function captureLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocStatus("error");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Redondea a ~110 m para no guardar la ubicación exacta.
        setCoords({
          lat: Math.round(pos.coords.latitude * 1000) / 1000,
          lng: Math.round(pos.coords.longitude * 1000) / 1000,
        });
        setLocStatus("on");
      },
      (err) => {
        setCoords(null);
        setLocStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const fieldClass =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ve-blue)]/30";
  const labelClass = "block text-sm font-medium mb-1.5";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="lng" value={coords?.lng ?? ""} />

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
          onChange={(e) => setTitleLen(e.target.value.length)}
          placeholder={
            isNeed
              ? "Ej: Familia de 5 necesita refugio en Altamira"
              : "Ej: Camión disponible para traslados en Caracas"
          }
        />
        <p
          className="mt-1 text-xs text-right"
          style={{ color: titleLen >= 120 ? "var(--color-need)" : "var(--color-muted)" }}
        >
          {titleLen}/120
        </p>
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
          onChange={(e) => setDescLen(e.target.value.length)}
          placeholder="Describe la situación, horarios, cantidades, condiciones, etc."
        />
        <p
          className="mt-1 text-xs text-right"
          style={{ color: descLen >= 1000 ? "var(--color-need)" : "var(--color-muted)" }}
        >
          {descLen}/1000
        </p>
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

      {/* Ubicación aproximada (opcional) */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">📍 Añadir mi ubicación aproximada</p>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Ayuda a que te encuentren las personas más cercanas. Se guarda aproximada
              (~100 m), nunca tu dirección exacta.
            </p>
          </div>
          {locStatus === "on" ? (
            <button
              type="button"
              onClick={() => {
                setCoords(null);
                setLocStatus("idle");
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[var(--color-offer-soft)] text-[var(--color-offer)] text-xs font-semibold px-3 py-2"
            >
              ✓ Añadida <span className="opacity-60">✕</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={captureLocation}
              disabled={locStatus === "loading"}
              className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold px-3 py-2 hover:border-[var(--color-ve-blue)] disabled:opacity-60"
            >
              {locStatus === "loading" ? "Ubicando…" : "Usar mi ubicación"}
            </button>
          )}
        </div>
        {(locStatus === "denied" || locStatus === "error") && (
          <p className="text-xs text-[var(--color-muted)] mt-2">
            {locStatus === "denied"
              ? "Permiso de ubicación denegado. Puedes indicar la zona arriba."
              : "No se pudo obtener la ubicación. Puedes indicar la zona arriba."}
          </p>
        )}
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
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneError}
            aria-describedby="phone-help"
            className={fieldClass}
            style={phoneError ? { borderColor: "var(--color-need)" } : undefined}
            placeholder="Ej: 0412 555 1234"
          />
          <p
            id="phone-help"
            className="mt-1.5 text-xs"
            style={{ color: phoneError ? "var(--color-need)" : "var(--color-muted)" }}
          >
            {phoneError
              ? "Ese número no parece válido. Revisa el código de área (ej: 0412 555 1234) o usa el código de país para números de otro país."
              : "Será el número con el que te contacten. Si no es de Venezuela, incluye el código de país (ej: +1 305 555 1234)."}
          </p>
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
          inputMode="numeric"
          min={1}
          max={9999}
          className={fieldClass}
          placeholder={isNeed ? "Personas afectadas" : "Capacidad / cupos"}
        />
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
          Número aproximado, entre 1 y 9999.
        </p>
      </div>

      {state.error && (
        <p className="rounded-xl bg-[var(--color-need-soft)] text-[var(--color-need)] text-sm px-4 py-3">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={pending || !category || !phoneValid}
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

function SuccessPanel({
  success,
}: {
  success: NonNullable<FormState["success"]>;
}) {
  const [copied, setCopied] = useState(false);
  const isNeed = success.type === "need";
  const accent = isNeed ? "var(--color-need)" : "var(--color-offer)";
  const manageUrl = success.token
    ? `/gestionar?id=${success.id}&token=${success.token}`
    : null;

  function copy() {
    if (!manageUrl) return;
    const full = `${window.location.origin}${manageUrl}`;
    navigator.clipboard?.writeText(full).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="text-center fade-in">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{ background: isNeed ? "var(--color-need-soft)" : "var(--color-offer-soft)" }}
      >
        ✅
      </div>
      <h2 className="text-xl font-bold">¡Tu publicación está activa!</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)] max-w-md mx-auto">
        Ya aparece en el tablón y las personas podrán contactarte por WhatsApp.
      </p>

      {manageUrl && (
        <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-left">
          <p className="text-sm font-medium">Gestiona tu publicación</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Desde este dispositivo verás los botones para marcarla como resuelta o
            eliminarla en tu tarjeta. Para gestionarla desde otro dispositivo, guarda
            este enlace privado:
          </p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}${manageUrl}`}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-[var(--color-ink)] text-white text-xs font-semibold px-3 py-2 whitespace-nowrap"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="rounded-xl text-white font-semibold px-5 py-3"
          style={{ background: accent }}
        >
          Ver en el tablón
        </Link>
        <a
          href={isNeed ? "/publicar?tipo=need" : "/publicar?tipo=offer"}
          className="rounded-xl border border-[var(--color-border)] font-semibold px-5 py-3 text-[var(--color-ink)]"
        >
          Publicar otra
        </a>
      </div>
    </div>
  );
}
