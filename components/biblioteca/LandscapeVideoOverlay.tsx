"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { YOUTUBE_IFRAME_ALLOW } from "@/lib/youtube-embed";
import { isMobilePortraitViewport } from "@/lib/youtube-video-aspect";

const OVERLAY_Z = 26_000;

/** Screen Orientation API — `lock`/`unlock` existem em runtime mas não no tipo DOM padrão. */
type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary") => Promise<void>;
  unlock?: () => void;
};

type Props = {
  embedUrl: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
};

/**
 * Ecrã cheio para vídeos horizontais no telemóvel em portrait:
 * rotação CSS (funciona em iOS/Safari) + tentativa de lock landscape onde o browser permite.
 */
export function LandscapeVideoOverlay({ embedUrl, title, closeLabel, onClose }: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [rotateLayout, setRotateLayout] = useState(false);

  useEffect(() => {
    setPortalReady(true);
    setRotateLayout(isMobilePortraitViewport());

    const mql = window.matchMedia("(max-width: 1023px) and (orientation: portrait)");
    const sync = () => setRotateLayout(mql.matches);
    mql.addEventListener("change", sync);

    let locked = false;
    const orientation = screen.orientation as ScreenOrientationWithLock | undefined;
    void orientation?.lock?.("landscape").then(
      () => {
        locked = true;
      },
      () => {
        /* CSS rotate fallback */
      }
    );

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      mql.removeEventListener("change", sync);
      document.body.style.overflow = prevOverflow;
      if (locked) void orientation?.unlock?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!portalReady) return null;

  const player = (
    <iframe
      src={embedUrl}
      title={title}
      allow={YOUTUBE_IFRAME_ALLOW}
      allowFullScreen
      style={{ width: "100%", height: "100%", border: "none", background: "#000" }}
    />
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: OVERLAY_Z,
        background: "#000",
        color: "#fff",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="btn btn-secondary"
        style={{
          position: "absolute",
          top: "max(12px, env(safe-area-inset-top, 0px))",
          right: "max(12px, env(safe-area-inset-right, 0px))",
          zIndex: 2,
          minHeight: 44,
          padding: "8px 14px",
          fontSize: 14,
        }}
      >
        {closeLabel}
      </button>

      {rotateLayout ? (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100vh",
            height: "100vw",
            transform: "translate(-50%, -50%) rotate(90deg)",
            transformOrigin: "center center",
          }}
        >
          {player}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {player}
        </div>
      )}
    </div>,
    document.body
  );
}
