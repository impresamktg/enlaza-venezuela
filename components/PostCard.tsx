import { CATEGORY_MAP, cityName } from "@/lib/data";
import { timeAgo, whatsappHref } from "@/lib/format";
import type { Post } from "@/lib/types";
import ManagePost from "./ManagePost";

export default function PostCard({
  post,
  manageToken,
}: {
  post: Post;
  manageToken?: string;
}) {
  const isNeed = post.type === "need";
  const category = CATEGORY_MAP[post.category];

  const accent = isNeed ? "var(--color-need)" : "var(--color-offer)";
  const softBg = isNeed ? "var(--color-need-soft)" : "var(--color-offer-soft)";
  const typeLabel = isNeed ? "Necesita" : "Ofrece";

  const waMessage = isNeed
    ? `Hola ${post.contact_name}, vi tu solicitud en AyudaVenezuela ("${post.title}") y quiero ayudarte.`
    : `Hola ${post.contact_name}, vi tu oferta en AyudaVenezuela ("${post.title}") y me interesa.`;

  return (
    <article className="fade-in flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="h-1 w-full" style={{ background: accent }} />
      <div className="p-4 flex flex-col gap-3 flex-1">
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
            <h3 className="font-semibold leading-snug">{post.title}</h3>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">{category?.label}</p>
          </div>
        </div>

        {post.description && (
          <p className="text-sm text-[var(--color-ink)]/80 line-clamp-4">{post.description}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)] pt-1">
          <span className="inline-flex items-center gap-1">
            📍 {cityName(post.city)}
            {post.zone ? ` · ${post.zone}` : ""}
          </span>
          {post.people_count ? (
            <span className="inline-flex items-center gap-1">
              👥 {post.people_count} {post.people_count === 1 ? "persona" : "personas"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-4">
        <a
          href={whatsappHref(post.contact_phone, waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] text-white font-semibold py-2.5 hover:brightness-95 transition"
        >
          <span aria-hidden>💬</span>
          Contactar a {post.contact_name.split(" ")[0]}
        </a>
        {manageToken && (
          <div className="mt-3 border-t border-[var(--color-border)] pt-3">
            <ManagePost postId={post.id} token={manageToken} />
          </div>
        )}
      </div>
    </article>
  );
}
