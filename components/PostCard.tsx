import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_MAP, cityName } from "@/lib/data";
import { timeAgo, whatsappHref, mapsSearchHref } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import type { Post } from "@/lib/types";
import ManagePost from "./ManagePost";
import SharePost from "./SharePost";
import RescueStatus from "./RescueStatus";
import PhotoGallery from "./PhotoGallery";

export default function PostCard({
  post,
  manageToken,
  distanceKm,
  detailHref,
}: {
  post: Post;
  manageToken?: string;
  distanceKm?: number;
  /** Si se indica, la tarjeta es la variante COMPACTA del tablón: el cuerpo abre el
   *  detalle y se ocultan descripción, estado de rescate y compartir (viven en el
   *  detalle). Sin detailHref es la variante COMPLETA (página de detalle). */
  detailHref?: string;
}) {
  const isNeed = post.type === "need";
  const category = CATEGORY_MAP[post.category];

  const accent = isNeed ? "var(--color-need)" : "var(--color-offer)";
  const softBg = isNeed ? "var(--color-need-soft)" : "var(--color-offer-soft)";
  const typeLabel = isNeed ? "Necesita" : "Ofrece";
  // Riel: crítico (rose-700) para personas atrapadas; si no, el color del tipo.
  const railColor = post.trapped ? "var(--color-need-strong)" : accent;

  const via = post.source ? "la red de ayuda" : "Enlaza Venezuela";
  const waMessage = isNeed
    ? `Hola ${post.contact_name}, vi tu solicitud en ${via} ("${post.title}") y quiero ayudarte.`
    : `Hola ${post.contact_name}, vi tu oferta en ${via} ("${post.title}") y me interesa.`;

  // Tablón = variante compacta de triaje; detalle = variante completa. Los
  // registros consumidos del pool (post.source) también van en variante compacta.
  const interactive = Boolean(detailHref) || Boolean(post.source);
  // El estado de rescate solo aplica a solicitudes (alguien necesita ser rescatado),
  // no a ofertas de ayuda en rescate.
  const isRescue =
    isNeed &&
    (post.trapped || post.category === "rescate" || post.category === "maquinaria");
  // Muchas publicaciones repiten el edificio como título y como dirección; no lo
  // mostramos dos veces.
  const addrIsTitle =
    !!post.address && post.address.trim().toLowerCase() === post.title.trim().toLowerCase();

  // Ubicación más concreta que tenemos para mostrar (dirección > zona > ciudad).
  // Una dirección que solo repite el título no cuenta como "concreta" para mostrar.
  const specificLoc = (post.address && !addrIsTitle ? post.address : null) || post.zone || null;

  // "Cómo llegar" se habilita cuando hay algo más preciso que la ciudad (dirección o
  // zona). Muchas publicaciones traen el edificio/calle en la zona o el título aunque
  // no llenen el campo dirección, así que lo aprovechamos en la búsqueda de Maps.
  const mapsHref =
    post.address || post.zone
      ? mapsSearchHref([post.address ?? post.title, post.zone, cityName(post.city), "Venezuela"])
      : null;

  const waHref = whatsappHref(post.contact_phone, waMessage);

  // ── Acción primaria (común a ambas variantes) ────────────────────────────
  const whatsappButton = (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-semibold min-h-[46px] px-4 hover:brightness-95 transition"
    >
      <span aria-hidden>💬</span>
      WhatsApp
    </a>
  );

  // ── VARIANTE COMPACTA (tablón) ───────────────────────────────────────────
  if (interactive) {
    // Ubicación en una línea: edificio/dirección primero (lo que usa el rescate),
    // ciudad · zona como apoyo. Sin caja aparte ni dirección duplicada del título.
    const locPrimary = specificLoc || cityName(post.city);
    const locSecondary = specificLoc ? cityName(post.city) : "";

    const hasMeta =
      post.corroboration_count > 0 ||
      typeof distanceKm === "number" ||
      Boolean(post.people_count && !post.trapped);

    return (
      <article className="fade-in group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md">
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: railColor }}
          aria-hidden
        />

        {post.trapped && (
          <div
            className="flex items-center gap-2 py-1.5 pl-5 pr-3 text-xs font-bold text-white"
            style={{ background: "var(--color-need-strong)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white pulse-dot" />
            🆘 Hay personas atrapadas en este lugar
            {post.people_count ? ` · ${post.people_count}` : ""}
          </div>
        )}

        <div className="flex flex-1 gap-3 px-4 pb-3 pl-5 pt-3.5">
          <CardBody detailHref={detailHref} sourceUrl={post.source ? post.source_url ?? null : null}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-[var(--color-ve-blue)]">
                <span aria-hidden className="mr-1">
                  {category?.icon ?? "🤝"}
                </span>
                {post.title}
              </h3>
              <time className="shrink-0 pt-0.5 text-[11px] leading-5 text-[var(--color-muted)]">
                {timeAgo(post.created_at)}
              </time>
            </div>

            {(category?.label || post.source) && (
              <p className="-mt-1 text-xs text-[var(--color-muted)]">
                {category?.label}
                {post.source ? (
                  <span style={{ color: "var(--color-ve-blue)" }}>
                    {category?.label ? " · " : ""}vía {post.source}
                  </span>
                ) : null}
              </p>
            )}

            <div className="flex items-start gap-1 text-sm">
              <span aria-hidden className="mt-px">
                📍
              </span>
              <span className="min-w-0">
                <span className="line-clamp-1 font-medium text-[var(--color-ink)]">
                  {locPrimary}
                </span>
                {locSecondary && (
                  <span className="line-clamp-1 text-xs text-[var(--color-muted)]">
                    {locSecondary}
                  </span>
                )}
              </span>
            </div>

            {hasMeta && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
                {post.corroboration_count > 0 && (
                  <span
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: "var(--color-need-strong)" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--color-need-strong)" }}
                    />
                    {post.corroboration_count + 1} reportes
                  </span>
                )}
                {typeof distanceKm === "number" && (
                  <span className="font-medium" style={{ color: "var(--color-ve-blue)" }}>
                    {formatDistance(distanceKm)}
                  </span>
                )}
                {post.people_count && !post.trapped ? (
                  <span className="inline-flex items-center gap-1">
                    👥 {post.people_count}
                  </span>
                ) : null}
              </div>
            )}
          </CardBody>

          {/* Miniatura ampliable: va al lado del texto, no añade alto. */}
          {post.photos.length > 0 && (
            <PhotoGallery photos={post.photos} variant="thumb" />
          )}
        </div>

        <div className="flex items-center gap-2 px-4 pb-4 pl-5">
          {whatsappButton}
          {mapsHref && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[46px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-semibold text-[var(--color-ink)] hover:border-[var(--color-ve-blue)] transition"
            >
              <span aria-hidden>🗺️</span>
              Cómo llegar
            </a>
          )}
        </div>

        {manageToken && (
          <div className="border-t border-[var(--color-border)] px-4 pb-4 pl-5 pt-3">
            <ManagePost postId={post.id} token={manageToken} />
          </div>
        )}
      </article>
    );
  }

  // ── VARIANTE COMPLETA (página de detalle) ────────────────────────────────
  return (
    <article className="fade-in relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: railColor }}
        aria-hidden
      />

      {post.trapped && (
        <div
          className="flex items-center gap-2 py-2 pl-5 pr-3 text-xs font-bold text-white"
          style={{ background: "var(--color-need-strong)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white pulse-dot" />
          🆘 Hay personas atrapadas en este lugar
          {post.people_count ? ` · ${post.people_count}` : ""}
        </div>
      )}

      <div className="flex flex-col gap-3 p-4 pl-5">
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
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{category?.label}</p>
          </div>
        </div>

        {post.address && !addrIsTitle && (
          <div className="flex items-start gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-sm font-semibold text-[var(--color-ink)]">
            <span aria-hidden>📍</span>
            <span>{post.address}</span>
          </div>
        )}

        {post.description && (
          <p className="text-sm text-[var(--color-ink)]/80">{post.description}</p>
        )}

        {post.photos.length > 0 && <PhotoGallery photos={post.photos} variant="grid" />}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-[var(--color-muted)]">
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
          {post.people_count && !post.trapped ? (
            <span className="inline-flex items-center gap-1">
              👥 {post.people_count} {post.people_count === 1 ? "persona" : "personas"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4 pl-5">
        {whatsappButton}

        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 font-semibold text-[var(--color-ink)] hover:border-[var(--color-ve-blue)] transition"
          >
            🗺️ Cómo llegar
          </a>
        )}

        {isRescue && (
          <RescueStatus postId={post.id} state={post.rescue_state} rescuedAt={post.rescued_at} />
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

/** Cuerpo clicable de la tarjeta compacta: enlace interno al detalle si es una
 *  publicación propia; enlace externo a la ficha de origen si viene del pool; o
 *  sin enlace si no hay destino. */
function CardBody({
  detailHref,
  sourceUrl,
  children,
}: {
  detailHref?: string;
  sourceUrl?: string | null;
  children: ReactNode;
}) {
  const cls = "flex min-w-0 flex-1 flex-col gap-1.5 text-[var(--color-ink)]";
  if (detailHref)
    return (
      <Link href={detailHref} className={cls}>
        {children}
      </Link>
    );
  if (sourceUrl)
    return (
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  return <div className={cls}>{children}</div>;
}
