import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Enlaza Venezuela",
    short_name: "Enlaza Venezuela",
    description:
      "Conecta a quien ofrece ayuda con quien la necesita tras el terremoto. Caracas y La Guaira.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f6",
    theme_color: "#1e3a8a",
    lang: "es",
    categories: ["social", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
