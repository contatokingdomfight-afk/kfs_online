"use client";

import { toEmbedVideoUrl, extractYouTubeVideoId } from "@/lib/youtube-embed";

type Props = {
  url: string;
  title: string;
  fallbackMessage?: string;
};

/**
 * Player de vídeo YouTube com fallback quando a URL é inválida ou não permite embed.
 */
export function VideoPlayer({ url, title, fallbackMessage = "Este vídeo não está disponível." }: Props) {
  const embedUrl = toEmbedVideoUrl(url);
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return (
      <div
        style={{
          padding: "clamp(24px, 6vw, 32px)",
          textAlign: "center",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          border: "1px dashed var(--border)",
        }}
      >
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{fallbackMessage}</p>
        <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
          Usa um link do YouTube (ex.: youtube.com/watch?v=... ou youtu.be/...)
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}
