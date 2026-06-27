import Link from "next/link";
import { CATEGORY_MAP, cityName } from "@/lib/data";
import { timeAgo, whatsappHref, mapsSearchHref } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import type { Post } from "@/lib/types";
import ManagePost from "./ManagePost";
import SharePost from "./SharePost";
import RescueStatus from "./RescueStatus";

export default function PostCard({
  post,
  manageToken,
  distanceKm,
  detailHref,
  compact = false,
}: {
  post: Post;
  manageToken?: string;
  distanceKm?: number;
  /** Si se indica, el cuerpo de la tarjeta abre el detalle de la publicación. */
  detailHref?: string;
  /** Variante para /rescate: comprime el cuerpo (oculta la descripción larga) y
   *  prioriza dirección + distancia + estado para decidir en terreno. */
  compact?: boolean;
}) {
  const isNeed = post.type === "need";
  const category = CATEGORY_MAP[post.category];

  const accent = isNeed ? "var(--color-need)" : "var(--color-offer)";
  const softBg = isNeed ? "var(--color-need-soft)" : "var(--color-offer-soft)";
  const typeLabel = isNeed ? "Necesita" : "Ofrece";
  // Riel: crítico (rose-700) para personas atrapadas; si no, el color del tipo.
  const railColor = post.trapped ? "var(--color-need-strong)" : accent;

  const waMessage = isNeed
    ? `Hola ${post.contact_name}, vi tu solicitud en Enlaza Venezuela ("${post.title}") y quiero ayudarte.`
    : `Hola ${post.contact_name}, vi tu oferta en Enlaza Venezuela ("${post.title}") y me interesa.`;

  const interactive = Boolean(detailHref);
  // El estado de rescate solo aplica a solicitudes (alguien necesita ser rescatado),
  // no a ofertas de ayuda en rescate.
  const isRescue =
    isNeed &&
    (post.trapped || post.category === "rescate" || post.category === "maquinaria");
  const mapsHref = post.address
    ? mapsSearchHref([post.address, post.zone, cityName(post.city), "Venezuela"])
    : null;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: softBg, color: accent }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          {typeLabel}
        </span>
        <span className="text-xs text-[var(--color-muted)]">{timeAgo(post.created_at)}</span>
      </div>

      <div className="flex items-start gap-2.5">
        <span className="text-2xl leading-none" aria-hidden>
          {category?.icon ?? "🤝"}
        </span>
        <div className="min-w-0">
          <h3
            className={`font-semibold leading-snug${
              interactive ? " transition-colors group-hover:text-[var(--color-ve-blue)]" : ""
            }`}
          >
            {post.title}
          </h3>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">{category?.label}</p>
        </div>
      </div>

      {post.address && (
        <div className="flex items-start gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm font-semibold text-[var(--color-ink)]">
          <span aria-hidden>📍</span>
          <span>{post.address}</span>
        </div>
      )}

      {post.description && !compact && (
        <p className="text-sm text-[var(--color-ink)]/80 line-clamp-4">{post.description}</p>
      )}

      {post.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {post.photos.slice(0, 2).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className={`w-full rounded-lg border border-[var(--color-border)] object-cover ${
                post.photos.length === 1 ? "col-span-2 max-h-56" : "h-32"
              }`}
            />
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)] pt-1">
        <span className="inline-flex items-center gap-1">
          📍 {cityName(post.city)}
          {post.zone ? ` · ${post.zone}` : ""}
        </span>
        {post.corroboration_count > 0 && (
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: "var(--color-need-strong)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-need-strong)" }}
            />
            Reportado por {post.corroboration_count + 1} personas
          </span>
        )}
        {typeof distanceKm === "number" && (
          <span
            className="inline-flex items-center gap-1 font-medium"
            style={{ color: "var(--color-ve-blue)" }}
          >
            {formatDistance(distanceKm)}
          </span>
        )}
        {/* El recuento de atrapados ya va en la bandera superior — no lo repetimos aquí. */}
        {post.people_count && !post.trapped ? (
          <span className="inline-flex items-center gap-1">
            👥 {post.people_count} {post.people_count === 1 ? "persona" : "personas"}
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      className={`fade-in relative flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm transition-shadow hover:shadow-md${
        interactive ? " group" : ""
      }`}
    >
      {/* Riel vertical de color: deja escanear la urgencia en columna. */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: railColor }}
        aria-hidden
      />

      {/* Bandera de emergencia: ancho completo, color crítico, se lee antes que el título. */}
      {post.trapped && (
        <div
          className="flex items-center gap-2 py-2 pl-5 pr-3 text-xs font-bold text-white"
          style={{ background: "var(--color-need-strong)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white pulse-dot" />
          🆘 PERSONAS ATRAPADAS
          {post.people_count ? ` · ${post.people_count}` : ""}
        </div>
      )}

      {detailHref ? (
        <Link href={detailHref} className="p-4 pl-5 flex flex-col gap-3 flex-1">
          {body}
        </Link>
      ) : (
        <div className="p-4 pl-5 flex flex-col gap-3 flex-1">{body}</div>
      )}

      <div className="px-4 pb-4 pl-5 flex flex-col gap-2">
        {/* Acción primaria única (N2): WhatsApp, ancho completo, ≥48px. */}
        <a
          href={whatsappHref(post.contact_phone, waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-semibold min-h-[48px] px-4 hover:brightness-95 transition"
        >
          <span aria-hidden>💬</span>
          WhatsApp
        </a>

        {/* Apoyo (N3): cómo llegar, contorno fino. */}
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] font-semibold px-3 py-2.5 text-[var(--color-ink)] hover:border-[var(--color-ve-blue)] transition"
          >
            🧭 Cómo llegar
          </a>
        )}

        {isRescue && (
          <RescueStatus
            postId={post.id}
            state={post.rescue_state}
            rescuedAt={post.rescued_at}
          />
        )}

        <div className="mt-1 flex justify-center">
          <SharePost postId={post.id} title={post.title} />
        </div>

        {manageToken && (
          <div className="mt-2 border-t border-[var(--color-border)] pt-3">
            <ManagePost postId={post.id} token={manageToken} />
          </div>
        )}
      </div>
    </article>
  );
}
