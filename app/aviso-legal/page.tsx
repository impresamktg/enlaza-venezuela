import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MinorSafetyNotice from "@/components/MinorSafetyNotice";

export const metadata: Metadata = {
  title: "Aviso legal — Enlaza Venezuela",
  description:
    "Iniciativa voluntaria y sin fines de lucro creada por venezolanos para ayudar a otros venezolanos. No somos empresa, organización ni grupo político.",
};

const PARRAFOS = [
  "Esta plataforma es una iniciativa creada de manera voluntaria por venezolanos para ayudar a otros venezolanos, sin fines de lucro.",
  "No somos una empresa, una organización, una fundación, un organismo gubernamental, ni estamos afiliados o respaldados por ningún partido, movimiento o grupo político.",
  "Nuestro único propósito es facilitar el contacto entre personas que necesitan ayuda y personas que pueden ofrecerla.",
  "La información publicada en esta plataforma es proporcionada voluntariamente por sus usuarios y es de carácter público dentro del funcionamiento del sitio. Cada persona es responsable de la información que comparte y de las interacciones que realice con otros usuarios.",
  "Protección de menores: por seguridad, no publiques ni difundas el nombre completo, la edad, la cédula ni la ubicación exacta de niños, niñas o adolescentes. Si un reporte involucra a un menor, comparte solo lo estrictamente necesario para ayudarle y, cuando sea posible, canalízalo a través de organizaciones especializadas en protección infantil.",
  "No recopilamos información personal con fines comerciales, no vendemos datos a terceros ni utilizamos la información de los usuarios para actividades de marketing.",
  "Esta plataforma actúa únicamente como un medio para facilitar la conexión entre las personas y no garantiza la disponibilidad, calidad, veracidad o cumplimiento de las ofertas, solicitudes o acuerdos que puedan surgir entre los usuarios.",
  "Al utilizar esta plataforma, aceptas hacer un uso responsable y respetuoso de este espacio, cuyo único objetivo es fomentar la ayuda entre venezolanos.",
];

export default function AvisoLegalPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Link
            href="/"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            ← Volver al tablón
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            Aviso legal
          </h1>

          <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
            <div className="mb-5">
              <MinorSafetyNotice />
            </div>
            <div className="space-y-4 text-[var(--color-ink)]/85 leading-relaxed">
              {PARRAFOS.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
