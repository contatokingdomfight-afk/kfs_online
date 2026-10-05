"use client";

import { useEffect, useRef } from "react";

/**
 * Vídeo de fundo do Hero. Força `.muted = true` e chama `.play()` via JS: o
 * atributo HTML `muted` nem sempre é aplicado de forma fiável à propriedade
 * do elemento durante a hidratação do React (bug conhecido em apps SSR), o
 * que faz o browser bloquear o autoplay silenciosamente e deixar só o
 * poster estático visível (parece "travado").
 */
export function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    const tryPlay = () => {
      video.play().catch(() => {
        /* autoplay bloqueado (ex.: economia de dados) — fica o poster estático */
      });
    };
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("loadeddata", tryPlay, { once: true });
    return () => video.removeEventListener("loadeddata", tryPlay);
  }, []);

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/media/banner-home-poster.jpg"
      aria-hidden="true"
    >
      <source src="/media/banner-home.mp4" type="video/mp4" />
    </video>
  );
}
