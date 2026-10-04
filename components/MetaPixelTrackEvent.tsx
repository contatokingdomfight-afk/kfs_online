"use client";

import { useEffect } from "react";

/**
 * Dispara um evento Meta Pixel uma vez ao montar (ex.: "Lead" num ecrã de sucesso
 * renderizado no servidor, onde não há um `state` de formulário no cliente para
 * reagir). No-op silencioso se o Meta Pixel não estiver carregado (sem consentimento
 * ou sem `NEXT_PUBLIC_META_PIXEL_ID`).
 */
export function MetaPixelTrackEvent({ event }: { event: string }) {
  useEffect(() => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", event);
    }
  }, [event]);

  return null;
}
