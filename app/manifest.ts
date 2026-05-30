import type { MetadataRoute } from "next";
import { BRAND_ICON_BG } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    lang: "pt",
    name: "Kingdom Fight School",
    short_name: "KFS",
    description: "Plataforma de gestão e ensino da Kingdom Fight School",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    orientation: "portrait-primary",
    /** Preto puro = fundo dos ícones; evita «caixa» cinza no splash nativo Android/iOS. */
    background_color: BRAND_ICON_BG,
    theme_color: BRAND_ICON_BG,
    categories: ["education", "sports", "fitness"],
    icons: [
      {
        src: "/icons/kfs-emblem-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/kfs-emblem-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/kfs-emblem-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/kfs-emblem-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
