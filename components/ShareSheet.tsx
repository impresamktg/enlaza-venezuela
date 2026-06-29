"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

const CANONICAL = "https://www.enlazavenezuela.com";

// Valores que solo existen en el cliente: SSR usa el snapshot del servidor
// (dominio canónico / sin share nativo) y el cliente actualiza tras hidratar,
// sin desajustes de hidratación ni setState dentro de un efecto.
const subscribeNoop = () => () => {};

/**
 * Compartir reutilizable, para una publicación o para todo el proyecto.
 *
 * - "Compartir" intenta enviar una IMAGEN vertical (story card) por la hoja nativa,
 *   para que Instagram / WhatsApp / Facebook ofrezcan "Añadir a tu historia/estado".
 *   Si no se puede, comparte el enlace; si tampoco, lo copia.
 * - Botones por canal: WhatsApp, Telegram, Facebook, X, correo y SMS.
 * - "Imagen para historia" descarga la tarjeta para subirla manualmente.
 *
 * `url` y `storyUrl` pueden ser relativos: se resuelven a absolutos al montar.
 */
export default function ShareSheet({
  url,
  storyUrl,
  title,
  message,
  imageName = "enlaza-venezuela.png",
  heading,
  subtext,
  variant = "compact",
}: {
  url: string;
  storyUrl: string;
  title: string;
  message: string;
  imageName?: string;
  heading?: string;
  subtext?: string;
  variant?: "section" | "compact";
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => CANONICAL,
  );
  const canNativeShare = useSyncExternalStore(
    subscribeNoop,
    () => typeof navigator !== "undefined" && !!navigator.share,
    () => false,
  );

  const abs = (u: string) =>
    u.startsWith("http") ? u : origin + (u.startsWith("/") ? u : `/${u}`);
  const shareUrl = abs(url);
  const storyHref = abs(storyUrl);
  const body = `${message} ${shareUrl}`;

  const channels: { key: string; href: string; label: string; bg?: string; icon: ReactNode }[] = [
    {
      key: "wa",
      href: `https://wa.me/?text=${encodeURIComponent(body)}`,
      label: "WhatsApp",
      bg: "#25D366",
      icon: <WhatsAppIcon />,
    },
    {
      key: "tg",
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`,
      label: "Telegram",
      bg: "#229ED9",
      icon: <TelegramIcon />,
    },
    {
      key: "fb",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      label: "Facebook",
      bg: "#1877F2",
      icon: <FacebookIcon />,
    },
    {
      key: "x",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}`,
      label: "X",
      bg: "#000000",
      icon: <XIcon />,
    },
    {
      key: "mail",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${message}\n\n${shareUrl}`)}`,
      label: "Correo",
      icon: <MailIcon />,
    },
    {
      key: "sms",
      href: `sms:?&body=${encodeURIComponent(body)}`,
      label: "SMS",
      icon: <SmsIcon />,
    },
  ];

  async function fetchStoryFile(): Promise<File | null> {
    try {
      const res = await fetch(storyHref);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], imageName, { type: blob.type || "image/png" });
    } catch {
      return null;
    }
  }

  async function shareNative() {
    if (busy) return;
    setBusy(true);
    try {
      // 1) Imagen → permite "Añadir a historia/estado" en redes.
      const file = await fetchStoryFile();
      if (
        file &&
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], text: message, url: shareUrl });
          return;
        } catch {
          return; // el usuario canceló
        }
      }
      // 2) Enlace.
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text: message, url: shareUrl });
          return;
        } catch {
          return;
        }
      }
      // 3) Copiar.
      await copyLink();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin portapapeles */
    }
  }

  const framed = variant === "section";

  return (
    <div
      className={
        framed
          ? "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
          : "w-full"
      }
    >
      {heading &&
        (framed ? (
          <div className="mb-4 flex items-start gap-3">
            <span className="text-2xl leading-none" aria-hidden>
              📣
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">{heading}</h2>
              {subtext && (
                <p className="mt-1 text-sm text-[var(--color-muted)]">{subtext}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            {heading}
          </p>
        ))}

      {/* Acción primaria: compartir nativo (imagen → historias) o copiar. */}
      <button
        type="button"
        onClick={shareNative}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ve-blue)] px-4 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        style={{ minHeight: 46 }}
      >
        <ShareIcon />
        {busy
          ? "Preparando…"
          : canNativeShare
            ? "Compartir"
            : copied
              ? "✓ Enlace copiado"
              : "Compartir / copiar enlace"}
      </button>

      {/* Canales */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {channels.map((c) => {
          const external = c.href.startsWith("http");
          return (
            <a
              key={c.key}
              href={c.href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              aria-label={`Compartir por ${c.label}`}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition hover:brightness-95"
              style={
                c.bg
                  ? { background: c.bg, color: "#ffffff", borderColor: c.bg }
                  : {
                      background: "var(--color-surface)",
                      color: "var(--color-ink)",
                      borderColor: "var(--color-border)",
                    }
              }
            >
              {c.icon}
              {c.label}
            </a>
          );
        })}
      </div>

      {/* Utilidades */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium">
        <a
          href={storyHref}
          download={imageName}
          className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          ⬇ Imagen para historia
        </a>
        <button
          type="button"
          onClick={copyLink}
          className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          {copied ? "✓ Enlace copiado" : "🔗 Copiar enlace"}
        </button>
      </div>
    </div>
  );
}

/* ── Iconos (currentColor, 18px) ─────────────────────────────────────────── */

const ICON = "h-[18px] w-[18px]";

function ShareIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212-.07-.062-.174-.041-.249-.024-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-9.75 6.42a1.5 1.5 0 0 1-1.5 0L1.5 8.67zM22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l10.5 6.916z" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 5.94 2 10.8c0 2.6 1.28 4.94 3.32 6.55-.14 1.16-.6 2.2-1.32 3.05-.18.2-.05.52.22.5 1.8-.13 3.4-.7 4.66-1.62.97.27 2 .42 3.12.42 5.523 0 10-3.94 10-8.8S17.523 2 12 2z" />
    </svg>
  );
}
