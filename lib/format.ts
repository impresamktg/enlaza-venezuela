// Prefijos de móviles venezolanos (los únicos que sirven para WhatsApp en VE).
const VE_MOBILE_PREFIXES = ["412", "414", "416", "424", "426"];

/** Solo dígitos, quitando el prefijo internacional "00" (p. ej. 0058… → 58…). */
function digitsOnly(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("00") ? d.slice(2) : d;
}

/** Si el número coincide con un patrón venezolano, lo normaliza a "58" + 10 dígitos. */
function toVenezuelan(digits: string): string | null {
  if (digits.startsWith("58") && digits.length === 12) return digits; // 58 + 4XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) return "58" + digits.slice(1); // 0412…
  if (digits.length === 10 && digits.startsWith("4")) return "58" + digits; // 412…
  return null;
}

/** Convierte un teléfono a formato wa.me (solo dígitos, con código de país). */
export function normalizePhone(raw: string): string {
  const digits = digitsOnly(raw);
  return toVenezuelan(digits) ?? digits;
}

/**
 * Valida que el número sirva realmente para contactar por WhatsApp.
 * Móviles venezolanos: prefijo válido (412, 414, 416, 424, 426).
 * Internacionales: formato E.164 (8–15 dígitos, con código de país, sin 0 inicial).
 */
export function isValidWhatsApp(raw: string): boolean {
  const digits = digitsOnly(raw);
  const ve = toVenezuelan(digits);
  if (ve) return VE_MOBILE_PREFIXES.includes(ve.slice(2, 5));
  return digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0");
}

/** Construye un enlace de WhatsApp con mensaje opcional. */
export function whatsappHref(phone: string, message?: string): string {
  const num = normalizePhone(phone);
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Tiempo relativo en español: "hace 5 min", "hace 2 h", "hace 3 días". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}
