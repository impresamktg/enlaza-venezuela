import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = { title: "Sin conexión — Enlaza Venezuela" };

export default function OfflinePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-md px-4 py-10 text-center">
          <div className="text-4xl mb-3" aria-hidden>
            📡
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sin conexión</h1>
          <p className="mt-2 text-[var(--color-muted)]">
            No hay internet en este momento. El tablón se actualizará cuando
            recuperes la conexión.
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--color-need)]/30 bg-[var(--color-need-soft)] p-5 text-left">
            <h2 className="font-semibold text-[var(--color-need)]">
              📞 Líneas de emergencia
            </h2>
            <ul className="mt-2 text-sm space-y-1 text-[var(--color-ink)]">
              <li>
                <strong>171</strong> — Emergencias (Bomberos, Protección Civil, salud)
              </li>
              <li>
                <strong>911</strong> — Emergencias generales
              </li>
            </ul>
          </div>

          <Link
            href="/"
            className="inline-block mt-6 rounded-xl bg-[var(--color-ink)] text-white font-medium px-5 py-2.5"
          >
            Reintentar
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
