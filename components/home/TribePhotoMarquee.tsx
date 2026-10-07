"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { PublicTribePhoto } from "@/lib/public-tribe-photos";

type Content = {
  tribeGalleryEyebrow: string;
  tribeGalleryTitle: string;
};

/** Cartões mínimos por metade da faixa — garante que o loop cobre ecrãs largos sem buracos. */
const MIN_CARDS_PER_HALF = 10;
const SECONDS_PER_CARD = 4;
/** Inclinação máxima (graus) quando o cursor está no canto do cartão. */
const MAX_TILT_DEG = 14;

/**
 * Carrossel infinito de fotos da Tribo com efeito "glitch" ao passar o rato ou o dedo:
 * o cartão sai do fundo (3D), inclina-se a seguir o ponteiro e ganha cortes RGB.
 * O glitch é CSS puro (camadas com clip-path) — a versão original corrompia o JPEG a cada
 * frame, o que é demasiado pesado para telemóveis.
 */
export function TribePhotoMarquee({ content, photos }: { content: Content; photos: PublicTribePhoto[] }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (photos.length === 0) return null;

  const repeats = Math.max(1, Math.ceil(MIN_CARDS_PER_HALF / photos.length));
  const half = Array.from({ length: repeats }, () => photos).flat();
  const cards = [...half, ...half];
  const trackStyle = { "--kfs-marquee-duration": `${half.length * SECONDS_PER_CARD}s` } as CSSProperties;

  const clearRelease = () => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
  };

  const tilt = (ev: PointerEvent<HTMLDivElement>) => {
    const el = ev.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width - 0.5;
    const y = (ev.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--kfs-rx", `${(-y * MAX_TILT_DEG).toFixed(2)}deg`);
    el.style.setProperty("--kfs-ry", `${(x * MAX_TILT_DEG).toFixed(2)}deg`);
  };

  const resetTilt = (el: HTMLDivElement) => {
    el.style.setProperty("--kfs-rx", "0deg");
    el.style.setProperty("--kfs-ry", "0deg");
  };

  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-20" aria-labelledby="tribo-galeria-titulo">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--primary)]">
          {content.tribeGalleryEyebrow}
        </p>
        <h2 id="tribo-galeria-titulo" className="mt-2 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.tribeGalleryTitle}
        </h2>
      </div>

      <div className="kfs-marquee mt-2" data-paused={activeKey ? "true" : undefined}>
        <div className="kfs-marquee__track" style={trackStyle}>
          {cards.map((photo, i) => {
            const key = `${photo.id}-${i}`;
            const isActive = activeKey === key;
            // Só a primeira cópia de cada foto é anunciada a leitores de ecrã.
            const isDuplicate = i >= photos.length;
            return (
              <div key={key} className="kfs-marquee__item" aria-hidden={isDuplicate || undefined}>
                <div
                  className="kfs-glitch-card"
                  data-active={isActive ? "true" : undefined}
                  style={{ "--kfs-img": `url("${photo.url}")` } as CSSProperties}
                  onPointerEnter={(ev) => {
                    if (ev.pointerType !== "mouse") return;
                    clearRelease();
                    setActiveKey(key);
                  }}
                  onPointerLeave={(ev) => {
                    if (ev.pointerType !== "mouse") return;
                    resetTilt(ev.currentTarget);
                    setActiveKey((k) => (k === key ? null : k));
                  }}
                  onPointerDown={(ev) => {
                    if (ev.pointerType === "mouse") return;
                    clearRelease();
                    setActiveKey(key);
                    tilt(ev);
                  }}
                  onPointerMove={tilt}
                  onPointerUp={(ev) => {
                    if (ev.pointerType === "mouse") return;
                    const el = ev.currentTarget;
                    // Mantém o destaque um instante depois de levantar o dedo.
                    releaseTimer.current = setTimeout(() => {
                      resetTilt(el);
                      setActiveKey((k) => (k === key ? null : k));
                    }, 900);
                  }}
                  onPointerCancel={(ev) => {
                    resetTilt(ev.currentTarget);
                    setActiveKey((k) => (k === key ? null : k));
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={isDuplicate ? "" : "Treino na Kingdom Fight School"}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="kfs-glitch-card__img"
                  />
                  <span className="kfs-glitch-card__layer kfs-glitch-card__layer--a" aria-hidden />
                  <span className="kfs-glitch-card__layer kfs-glitch-card__layer--b" aria-hidden />
                  <span className="kfs-glitch-card__scan" aria-hidden />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
