import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RescueForm from "@/components/RescueForm";

export const metadata: Metadata = {
  title: "Pedir ayuda: hay personas atrapadas — Enlaza Venezuela",
  description:
    "Pide ayuda para un lugar donde hay personas atrapadas. Tu pedido se hace visible para que quien pueda ayudar (voluntarios, maquinaria, brigadas) te contacte por WhatsApp.",
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
            ← Ver lugares con personas atrapadas
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-need)]">
            🆘 Pide ayuda: hay personas atrapadas
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Di dónde es y qué se necesita (maquinaria, herramientas, manos). Tu pedido se
            hace visible para que quien pueda ayudar te contacte. Enlaza no envía equipos
            de rescate; conecta a la gente.
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
