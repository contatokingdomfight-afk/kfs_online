import type { MetadataRoute } from "next";

const THEME = "#ED1C24";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    lang: "pt",
    name: "Kingdom Fight School",
    short_name: "KFS",
    description: "Plataforma de gestão e ensino da Kingdom Fight School",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: THEME,
    theme_color: THEME,
    categories: ["education", "sports", "fitness"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
