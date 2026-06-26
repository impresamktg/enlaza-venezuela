import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm text-[var(--color-muted)]">
        <div className="max-w-md">
          <div className="font-semibold text-[var(--color-ink)]">Enlaza Venezuela</div>
          <p className="mt-1">
            Iniciativa comunitaria sin fines de lucro para coordinar ayuda tras el
            terremoto. Verifica siempre con quién hablas antes de compartir datos o
            entregar recursos.
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          <Link href="/" className="hover:text-[var(--color-ink)]">
            Tablón de ayuda
          </Link>
          <Link href="/publicar" className="hover:text-[var(--color-ink)]">
            Publicar
          </Link>
          <Link href="/recursos" className="hover:text-[var(--color-ink)]">
            Recursos oficiales y seguridad
          </Link>
          <Link href="/aviso-legal" className="hover:text-[var(--color-ink)]">
            Aviso legal
          </Link>
        </nav>
      </div>
    </footer>
  );
}
