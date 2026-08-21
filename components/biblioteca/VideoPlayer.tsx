"use client";

import { useEffect, useState } from "react";
import { toEmbedVideoUrl, extractYouTubeVideoId, YOUTUBE_IFRAME_ALLOW } from "@/lib/youtube-embed";
import {
  fetchYouTubeVideoAspect,
  isMobilePortraitViewport,
  type VideoAspect,
} from "@/lib/youtube-video-aspect";
import { LandscapeVideoOverlay } from "./LandscapeVideoOverlay";

type Props = {
  url: string;
  title: string;
  fallbackMessage?: string;
  /** Em telemóvel portrait, abre automaticamente o modo horizontal para vídeos landscape. */
  autoLandscapeOnMobile?: boolean;
  landscapeButtonLabel?: string;
  closeLandscapeLabel?: string;
};

/**
 * Player de vídeo YouTube com fallback quando a URL é inválida.
 * Vídeos horizontais no telemóvel (portrait): modo cinema com rotação automática.
 */
export function VideoPlayer({
  url,
  title,
  fallbackMessage = "Este vídeo não está disponível.",
  autoLandscapeOnMobile = true,
  landscapeButtonLabel = "Ver em horizontal",
  closeLandscapeLabel = "Fechar",
}: Props) {
  const embedUrl = toEmbedVideoUrl(url);
  const videoId = extractYouTubeVideoId(url);
  const [aspect, setAspect] = useState<VideoAspect>("unknown");
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchYouTubeVideoAspect(url).then((a) => {
      if (!cancelled) setAspect(a);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!autoLandscapeOnMobile || autoOpened || aspect !== "landscape") return;
    if (!isMobilePortraitViewport()) return;
    setCinemaOpen(true);
    setAutoOpened(true);
  }, [aspect, autoLandscapeOnMobile, autoOpened]);

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

  const paddingBottom = aspect === "portrait" ? "177.78%" : "56.25%";

  return (
    <>
      <div>
        {aspect === "landscape" && isMobilePortraitViewport() && !cinemaOpen && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: "100%", marginBottom: 10, minHeight: 44, fontSize: 14 }}
            onClick={() => setCinemaOpen(true)}
          >
            {landscapeButtonLabel}
          </button>
        )}
        <div style={{ position: "relative", paddingBottom, height: 0, overflow: "hidden", borderRadius: "var(--radius-md)" }}>
          {!cinemaOpen && (
            <iframe
              src={embedUrl}
              title={title}
              allow={YOUTUBE_IFRAME_ALLOW}
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
            />
          )}
          {cinemaOpen && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-secondary)",
                color: "var(--text-secondary)",
                fontSize: 14,
                padding: 16,
                textAlign: "center",
              }}
            >
              A reproduzir em ecrã horizontal…
            </div>
          )}
        </div>
      </div>

      {cinemaOpen && (
        <LandscapeVideoOverlay
          embedUrl={embedUrl}
          title={title}
          closeLabel={closeLandscapeLabel}
          onClose={() => setCinemaOpen(false)}
        />
      )}
    </>
  );
}
