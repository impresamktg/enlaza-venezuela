import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RescueForm from "@/components/RescueForm";

export const metadata: Metadata = {
  title: "Reportar persona atrapada — Enlaza Venezuela",
  description:
    "Reporta personas atrapadas o pide rescate. Aparece al instante en el mapa de rescate para que lleguen maquinaria y rescatistas.",
};

export default function ReportarPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-8">
          <Link
            href="/rescate"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Mapa de rescate
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-need)]">
            🆘 Reportar persona atrapada
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Completa lo esencial. Aparece de inmediato para que rescatistas y maquinaria
            sepan adónde ir.
          </p>

          <div className="mt-6">
            <RescueForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
