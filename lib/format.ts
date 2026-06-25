/** Convierte un teléfono venezolano a formato wa.me (solo dígitos, con 58). */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("58")) return digits;
  if (digits.startsWith("0")) digits = digits.slice(1);
  // Números móviles venezolanos: 10 dígitos empezando por 4 (412, 414, 424...)
  if (digits.length === 10 && digits.startsWith("4")) return "58" + digits;
  if (digits.length === 11 && digits.startsWith("04")) return "58" + digits.slice(1);
  return digits;
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
