import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Org {
  name: string;
  desc: string;
  url: string;
}

const ORGS: Org[] = [
  {
    name: "Cruz Roja / IFRC",
    desc: "Respuesta de emergencia, búsqueda y rescate, atención médica y refugio.",
    url: "https://www.ifrc.org/press-release/venezuela-red-cross-responds-needs-emerge-aftermath-powerful-back-back-earthquakes",
  },
  {
    name: "GlobalGiving — Fondo de Emergencia Venezuela",
    desc: "Financia a organizaciones locales: respuesta vital, atención médica, refugio, agua.",
    url: "https://www.globalgiving.org/projects/venezuela-earthquake-relief-fund/",
  },
  {
    name: "Direct Relief",
    desc: "Medicamentos e insumos médicos de emergencia para la región afectada.",
    url: "https://www.directrelief.org/2026/06/venezuela-earthquake-caracas-damage/",
  },
  {
    name: "International Medical Corps",
    desc: "Equipo en el país brindando servicios de salud y asistencia rápida.",
    url: "https://internationalmedicalcorps.org/emergency-response/venezuela-earthquakes/",
  },
  {
    name: "World Vision",
    desc: "Asistencia de emergencia enfocada en niñez y familias afectadas.",
    url: "https://www.worldvision.org/disaster-relief-news-stories/venezuela-earthquake-latest-updates-fast-facts-and-how-to-help",
  },
  {
    name: "Global Empowerment Mission / I Love Venezuela",
    desc: "Equipos de respuesta desplegados para evaluar necesidades y operar en terreno.",
    url: "https://www.globalempowermentmission.org/mission/venezuela-earthquake/",
  },
];

export default function RecursosPage() {
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
            Recursos oficiales y seguridad
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Para emergencias y donaciones, acude siempre a organizaciones verificadas.
          </p>

          {/* Emergencias */}
          <section className="mt-6 rounded-2xl border border-[var(--color-need)]/30 bg-[var(--color-need-soft)] p-5">
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
              <li>
                Sigue las indicaciones de Protección Civil y la Alcaldía de Caracas sobre
                refugios y zonas seguras.
              </li>
            </ul>
          </section>

          {/* Organizaciones */}
          <section className="mt-6">
            <h2 className="font-semibold">Organizaciones que están respondiendo</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ORGS.map((org) => (
                <a
                  key={org.url}
                  href={org.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:shadow-md transition-shadow"
                >
                  <div className="font-medium">{org.name}</div>
                  <div className="text-sm text-[var(--color-muted)] mt-1">{org.desc}</div>
                  <div className="text-xs text-[var(--color-ve-blue)] mt-2">
                    Visitar sitio →
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Seguridad */}
          <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="font-semibold">🛡️ Consejos de seguridad al coordinar ayuda</h2>
            <ul className="mt-3 text-sm space-y-2 text-[var(--color-ink)]/80 list-disc pl-5">
              <li>Verifica la identidad de la persona antes de entregar recursos o acudir a una dirección.</li>
              <li>Coordina encuentros en lugares públicos y, de ser posible, acompañado.</li>
              <li>No compartas datos bancarios ni transferencias por adelantado.</li>
              <li>Desconfía de quien pida dinero en efectivo de forma urgente o presione.</li>
              <li>Tras donaciones de dinero, prioriza siempre organizaciones reconocidas.</li>
              <li>Cuidado con perfiles y recaudaciones falsas que surgen tras los desastres.</li>
            </ul>
          </section>

          <p className="mt-8 text-xs text-[var(--color-muted)]">
            AyudaVenezuela es una plataforma comunitaria independiente y no verifica la
            veracidad de cada publicación. Úsala con criterio.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
