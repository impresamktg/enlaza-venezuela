export default function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="bg-amber-50 border-b border-amber-200 text-amber-900"
    >
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-start gap-2">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.515 2.625H3.72c-1.345 0-2.188-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-xs sm:text-sm leading-snug">
          <strong className="font-semibold">Enlaza Venezuela</strong> no es un
          canal oficial del Estado venezolano, ni pretende reemplazar a
          autoridades gubernamentales u organismos de emergencia. Esta
          información solo pretende visualizar algunos datos en contexto con las
          fuentes oficiales.
        </p>
      </div>
    </div>
  );
}
