"use client";

import { useEffect, useRef, useState } from "react";
import { YOUTUBE_IFRAME_ALLOW } from "@/lib/youtube-embed";

type Props = {
  src: string;
  title: string;
  className?: string;
  /** Só monta o iframe quando a secção entra no viewport (melhora LCP e evita avisos precoces). */
  lazy?: boolean;
};

export function YouTubeIframe({ src, title, className = "h-full w-full border-0", lazy = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSrc, setActiveSrc] = useState<string | null>(lazy ? null : src);

  useEffect(() => {
    if (!lazy || activeSrc) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActiveSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, activeSrc, src]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {activeSrc ? (
        <iframe
          src={activeSrc}
          title={title}
          allow={YOUTUBE_IFRAME_ALLOW}
          allowFullScreen
          loading="lazy"
          className={className}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)]"
          aria-hidden
        />
      )}
    </div>
  );
}
