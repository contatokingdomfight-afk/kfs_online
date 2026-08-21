import { extractYouTubeVideoId } from "@/lib/youtube-embed";

export type VideoAspect = "landscape" | "portrait" | "unknown";

/** URLs `/shorts/` são quase sempre verticais. */
export function isLikelyYouTubeShort(url: string): boolean {
  try {
    const u = new URL(url);
    return u.pathname.includes("/shorts/");
  } catch {
    return url.includes("/shorts/");
  }
}

/**
 * Proporção do vídeo via oEmbed público do YouTube (sem API key).
 * Vídeos horizontais típicos: 480×270; Shorts tendem height > width.
 */
export async function fetchYouTubeVideoAspect(url: string): Promise<VideoAspect> {
  if (isLikelyYouTubeShort(url)) return "portrait";
  if (!extractYouTubeVideoId(url)) return "unknown";

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return "landscape";
    const data = (await res.json()) as { width?: number; height?: number };
    const w = data.width ?? 0;
    const h = data.height ?? 0;
    if (w > 0 && h > 0) return h > w ? "portrait" : "landscape";
  } catch {
    // fallback: watch normal assume horizontal
  }
  return "landscape";
}

export function isMobilePortraitViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px) and (orientation: portrait)").matches;
}
