/**
 * Converte URLs do YouTube em URL de embed para iframe.
 * Suporta: watch?v=, youtu.be, shorts/, embed/, v/
 */
export function toEmbedVideoUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      if (u.searchParams.has("v")) {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      const pathMatch = u.pathname.match(/\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) return `https://www.youtube.com/embed/${pathMatch[1]}`;
    }

    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    // URL inválida
  }
  return url;
}

/** Extrai o ID do vídeo de uma URL do YouTube, ou null se inválida. */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      if (u.searchParams.has("v")) return u.searchParams.get("v");
      const pathMatch = u.pathname.match(/\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) return pathMatch[1];
    }

    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id || null;
    }
  } catch {
    //
  }
  return null;
}

/** Permissões do iframe YouTube (inclui compute-pressure para evitar violações no consola). */
export const YOUTUBE_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; compute-pressure";

export function youtubeEmbedSrc(videoId: string, params?: Record<string, string>): string {
  const search = params ? `?${new URLSearchParams(params)}` : "";
  return `https://www.youtube.com/embed/${videoId}${search}`;
}
