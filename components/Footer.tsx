import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm text-[var(--color-muted)]">
        <div className="max-w-md">
          <div className="font-semibold text-[var(--color-ink)]">Enlaza Venezuela</div>
          <p className="mt-1">
            Iniciativa comunitaria sin fines de lucro que conecta a quien necesita ayuda
            con quien puede ofrecerla.{" "}
            <strong>No coordinamos rescates ni enviamos equipos</strong>, ni verificamos
            cada publicación: verifica siempre con quién hablas antes de compartir datos o
            entregar recursos.
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          <Link href="/" className="hover:text-[var(--color-ink)]">
            Tablón de ayuda
          </Link>
          <Link href="/directorio" className="hover:text-[var(--color-ink)]">
            Directorio de ofertas
          </Link>
          <Link href="/desaparecidos" className="hover:text-[var(--color-ink)]">
            Buscar desaparecidos
          </Link>
          <Link href="/publicar" className="hover:text-[var(--color-ink)]">
            Publicar
          </Link>
          <Link href="/rescate" className="hover:text-[var(--color-ink)]">
            Lugares con personas atrapadas
          </Link>
          <Link href="/rescatados" className="hover:text-[var(--color-ink)]">
            Rescatados
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
