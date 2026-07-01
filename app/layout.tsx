import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import DisclaimerBanner from "@/components/DisclaimerBanner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.enlazavenezuela.com"),
  title: "Enlaza Venezuela — Conectamos quien necesita ayuda con quien puede ayudar",
  description:
    "Conectamos directamente, por WhatsApp, a quien necesita algo (insumos, transporte, refugio, salud, maquinaria, manos) con quien puede ofrecerlo, tras los terremotos del 24 de junio de 2026 en Venezuela. Caracas y La Guaira.",
  openGraph: {
    title: "Enlaza Venezuela — Necesito ayuda · Puedo ayudar",
    description:
      "Conectamos por WhatsApp a quien necesita algo con quien puede ofrecerlo tras el terremoto. Insumos, transporte, refugio, salud, maquinaria y más. Caracas y La Guaira.",
    siteName: "Enlaza Venezuela",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enlaza Venezuela — Necesito ayuda · Puedo ayudar",
    description:
      "Conectamos por WhatsApp a quien necesita algo con quien puede ofrecerlo tras el terremoto en Venezuela.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Enlaza Venezuela",
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
        <DisclaimerBanner />
        {children}
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
