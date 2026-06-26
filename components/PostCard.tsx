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
}: {
  post: Post;
  manageToken?: string;
  distanceKm?: number;
  /** Si se indica, el cuerpo de la tarjeta abre el detalle de la publicación. */
  detailHref?: string;
}) {
  const isNeed = post.type === "need";
  const category = CATEGORY_MAP[post.category];

  const accent = isNeed ? "var(--color-need)" : "var(--color-offer)";
  const softBg = isNeed ? "var(--color-need-soft)" : "var(--color-offer-soft)";
  const typeLabel = isNeed ? "Necesita" : "Ofrece";

  const waMessage = isNeed
    ? `Hola ${post.contact_name}, vi tu solicitud en Enlaza Venezuela ("${post.title}") y quiero ayudarte.`
    : `Hola ${post.contact_name}, vi tu oferta en Enlaza Venezuela ("${post.title}") y me interesa.`;

  const interactive = Boolean(detailHref);
  const isRescue =
    post.trapped || post.category === "rescate" || post.category === "maquinaria";
  const mapsHref = post.address
    ? mapsSearchHref([post.address, post.zone, cityName(post.city), "Venezuela"])
    : null;

  const body = (
    <>
      {post.trapped && (
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold"
          style={{ background: "var(--color-need)", color: "#fff" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          🆘 PERSONAS ATRAPADAS
        </div>
      )}

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
        <p className="text-sm font-medium text-[var(--color-ink)] flex items-start gap-1.5">
          <span aria-hidden>📌</span>
          <span>{post.address}</span>
        </p>
      )}

      {post.description && (
        <p className="text-sm text-[var(--color-ink)]/80 line-clamp-4">{post.description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)] pt-1">
        <span className="inline-flex items-center gap-1">
          📍 {cityName(post.city)}
          {post.zone ? ` · ${post.zone}` : ""}
        </span>
        {typeof distanceKm === "number" && (
          <span
            className="inline-flex items-center gap-1 font-medium"
            style={{ color: "var(--color-ve-blue)" }}
          >
            {formatDistance(distanceKm)}
          </span>
        )}
        {post.people_count ? (
          <span className="inline-flex items-center gap-1">
            👥 {post.people_count} {post.people_count === 1 ? "persona" : "personas"}
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      className={`fade-in flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm transition-shadow hover:shadow-md${
        interactive ? " group" : ""
      }`}
    >
      <div className="h-1 w-full" style={{ background: accent }} />
      {detailHref ? (
        <Link href={detailHref} className="p-4 flex flex-col gap-3 flex-1">
          {body}
        </Link>
      ) : (
        <div className="p-4 flex flex-col gap-3 flex-1">{body}</div>
      )}

      <div className="px-4 pb-4">
        <div className="flex gap-2">
          <a
            href={whatsappHref(post.contact_phone, waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-semibold py-2.5 hover:brightness-95 transition"
          >
            <span aria-hidden>💬</span>
            WhatsApp
          </a>
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] font-semibold px-3 py-2.5 text-[var(--color-ink)] hover:border-[var(--color-ve-blue)] transition whitespace-nowrap"
            >
              🧭 Cómo llegar
            </a>
          )}
        </div>
        {isRescue && <RescueStatus postId={post.id} state={post.rescue_state} />}
        <div className="mt-2 flex justify-center">
          <SharePost postId={post.id} title={post.title} />
        </div>
        {manageToken && (
          <div className="mt-3 border-t border-[var(--color-border)] pt-3">
            <ManagePost postId={post.id} token={manageToken} />
          </div>
        )}
      </div>
    </article>
  );
}
