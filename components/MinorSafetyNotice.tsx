/**
 * Aviso de protección de menores. Directriz acordada por la red de equipos:
 * no exponer nombre completo, edad, cédula ni ubicación exacta de menores de
 * edad (riesgo real de trata). En rescate la ubicación exacta sí es necesaria
 * para los rescatistas, así que se omite con `includeLocation={false}`.
 */
export default function MinorSafetyNotice({
  includeLocation = true,
}: {
  includeLocation?: boolean;
}) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-[var(--color-ve-yellow)]/50 bg-[var(--color-ve-yellow)]/10 px-3.5 py-3 text-sm">
      <span className="text-base leading-none" aria-hidden>
        🛡️
      </span>
      <p className="text-[var(--color-ink)]">
        <strong>Protege a los menores.</strong> No publiques el nombre completo, la edad
        {includeLocation ? ", la cédula ni la ubicación exacta" : " ni la cédula"} de
        niños, niñas o adolescentes. Comparte solo lo necesario para ayudar.
      </p>
    </div>
  );
}
