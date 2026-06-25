import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur border-b border-[var(--color-border)]">
      <div className="flag-stripe" />
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="Enlaza Venezuela — inicio">
          <Image
            src="/logo.png"
            alt="Enlaza Venezuela"
            width={300}
            height={99}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link
            href="/recursos"
            className="px-3 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition-colors"
          >
            Recursos oficiales
          </Link>
          <Link
            href="/publicar"
            className="px-3 py-2 rounded-lg bg-[var(--color-ink)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Publicar
          </Link>
        </nav>
      </div>
    </header>
  );
}
