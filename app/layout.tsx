import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.enlazavenezuela.com"),
  title: "Enlaza Venezuela — El rescate es la prioridad",
  description:
    "El rescate es la prioridad: conectamos maquinaria pesada, herramientas y voluntarios con experiencia para búsqueda, rescate y remoción de escombros tras los terremotos del 24 de junio de 2026 en Venezuela. También refugio, alimentos y salud. Caracas y La Guaira.",
  openGraph: {
    title: "Enlaza Venezuela — El rescate es la prioridad",
    description:
      "Conectamos maquinaria, herramientas y voluntarios para búsqueda y rescate tras el terremoto. También refugio, alimentos y salud. Caracas y La Guaira.",
    siteName: "Enlaza Venezuela",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enlaza Venezuela — El rescate es la prioridad",
    description:
      "Conectamos maquinaria, herramientas y voluntarios para búsqueda y rescate tras el terremoto.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Enlaza VE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
