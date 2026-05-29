import type { MetadataRoute } from "next";
import { BRAND_BG } from "@/lib/brand";

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
    background_color: BRAND_BG,
    /** Grafite no arranque da PWA; vermelho só em botões/UI (`--primary`). */
    theme_color: BRAND_BG,
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
