import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.enlazavenezuela.com"),
  title: "Enlaza Venezuela — Conecta ayuda tras el terremoto",
  description:
    "Plataforma comunitaria que conecta a quienes ofrecen ayuda con quienes la necesitan tras los terremotos del 24 de junio de 2026 en Venezuela. Enfocada en Caracas y La Guaira.",
  openGraph: {
    title: "Enlaza Venezuela — Conecta ayuda tras el terremoto",
    description:
      "Conecta a quienes ofrecen ayuda con quienes la necesitan tras el terremoto. Caracas y La Guaira.",
    siteName: "Enlaza Venezuela",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enlaza Venezuela — Conecta ayuda tras el terremoto",
    description:
      "Conecta a quienes ofrecen ayuda con quienes la necesitan tras el terremoto.",
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
      </body>
    </html>
  );
}
