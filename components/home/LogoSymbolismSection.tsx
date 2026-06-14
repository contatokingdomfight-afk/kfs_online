"use client";

import { useCallback, useId, useState } from "react";
import type { HomeContent } from "@/lib/home-content";

type ItemId = "octagon" | "fighter" | "colors" | "crown" | "blood" | "prophecy";

const LEFT_COL: ItemId[] = ["octagon", "colors", "blood"];
const RIGHT_COL: ItemId[] = ["fighter", "crown", "prophecy"];

const FIELD: Record<ItemId, { title: keyof HomeContent; body: keyof HomeContent }> = {
  octagon: { title: "symbolismOctagonTitle", body: "symbolismOctagonBody" },
  fighter: { title: "symbolismFighterTitle", body: "symbolismFighterBody" },
  colors: { title: "symbolismColorsTitle", body: "symbolismColorsBody" },
  crown: { title: "symbolismCrownTitle", body: "symbolismCrownBody" },
  blood: { title: "symbolismBloodTitle", body: "symbolismBloodBody" },
  prophecy: { title: "symbolismProphecyTitle", body: "symbolismProphecyBody" },
};

/**
 * viewBox dos SVG exportados (`KFS simbolo significados/*.svg` — mesmo viewBox em todos).
 * A arte servida é `public/brand/symbolism/foto-completa.svg` (mesma composição).
 */
const VIEWBOX_W = 1235.25;
const VIEWBOX_H = 716.249982;

/** Rectângulos normalizados (0–1) a partir dos clipPath dos ficheiros por tema. */
function clipNorm(x1: number, y1: number, x2: number, y2: number) {
  const xl = Math.min(x1, x2);
  const xr = Math.max(x1, x2);
  const yt = Math.min(y1, y2);
  const yb = Math.max(y1, y2);
  return {
    top: yt / VIEWBOX_H,
    left: xl / VIEWBOX_W,
    width: (xr - xl) / VIEWBOX_W,
    height: (yb - yt) / VIEWBOX_H,
  };
}

const HOTSPOTS: Record<ItemId, { top: number; left: number; width: number; height: number }> = {
  octagon: clipNorm(125.292969, 0, 1109.015625, 715.5),
  crown: clipNorm(188.972656, 71.550781, 1045.328125, 643.949219),
  fighter: clipNorm(340.761719, 71.550781, 893.683594, 643.949219),
  colors: clipNorm(316.957031, 71.550781, 892.355469, 650.695312),
  blood: clipNorm(107.832031, 180.238281, 1148.492188, 535.367188),
  prophecy: clipNorm(71.820312, 180.238281, 1162.679688, 535.367188),
};

/**
 * Ordem dos botões invisíveis: regiões maiores primeiro, mais específicas por cima
 * (sobreposição dos clips do export).
 */
const HOTSPOT_HIT_ORDER: ItemId[] = ["octagon", "crown", "colors", "blood", "prophecy", "fighter"];

const LOGO_SRC = "/brand/symbolism/foto-completa.svg";

function pct(n: number) {
  return `${n * 100}%`;
}

export function LogoSymbolismSection({ content }: { content: HomeContent }) {
  const uid = useId();
  const [active, setActive] = useState<ItemId | null>(null);

  const select = useCallback((id: ItemId | null) => {
    setActive(id);
  }, []);

  const boxStyle = (id: ItemId) => {
    const z = HOTSPOTS[id];
    return {
      top: pct(z.top),
      left: pct(z.left),
      width: pct(z.width),
      height: pct(z.height),
    } as const;
  };

  const panel =
    active != null ? (
      <div
        className="rounded-xl border border-red-500/35 bg-black/55 p-5 shadow-[0_0_40px_rgba(220,38,38,0.12)] backdrop-blur-sm sm:p-6"
        role="region"
        aria-live="polite"
        id={`${uid}-panel`}
      >
        <h3 className="text-base font-bold uppercase tracking-wide text-red-400 sm:text-lg">
          {content[FIELD[active].title]}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-200 sm:text-[15px]">{content[FIELD[active].body]}</p>
      </div>
    ) : (
      <div
        className="rounded-xl border border-zinc-700/60 bg-zinc-950/50 p-5 text-center text-sm text-zinc-400 sm:p-6 sm:text-[15px]"
        id={`${uid}-panel`}
      >
        {content.symbolismHint}
      </div>
    );

  const chip = (id: ItemId) => {
    const on = active === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => select(on ? null : id)}
        onMouseEnter={() => select(id)}
        onFocus={() => select(id)}
        aria-pressed={on}
        className={[
          "w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all sm:py-3",
          on
            ? "border-red-500/70 bg-red-950/40 text-red-100 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.25)]"
            : "border-zinc-700/80 bg-zinc-900/40 text-zinc-200 hover:border-red-500/40 hover:bg-zinc-800/50",
        ].join(" ")}
      >
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle" aria-hidden />
        {content[FIELD[id].title]}
      </button>
    );
  };

  return (
    <section
      className="relative border-t border-red-900/25 bg-gradient-to-b from-[#070708] via-[#0c0c10] to-[#050506] py-16 sm:py-24"
      aria-labelledby={`${uid}-heading`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(220,38,38,0.08), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(148,163,184,0.06), transparent 50%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id={`${uid}-heading`}
          className="text-center text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl"
          style={{ textShadow: "0 0 28px rgba(220,38,38,0.15)" }}
        >
          {content.symbolismTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-zinc-400 sm:text-base">{content.symbolismSubtitle}</p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(240px,380px)_minmax(0,1fr)] lg:items-start">
          <div className="order-2 flex flex-col gap-2.5 lg:order-1 lg:pt-4">{LEFT_COL.map(chip)}</div>

          <div className="order-1 mx-auto w-full max-w-[min(100%,380px)] lg:order-2">
            <div className="rounded-2xl border border-zinc-700/80 bg-gradient-to-br from-zinc-900 to-black p-2 shadow-[0_20px_60px_rgba(0,0,0,0.65)] ring-1 ring-red-900/20 sm:p-3">
              <div
                className="relative w-full overflow-hidden rounded-xl"
                style={{ aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}` }}
              >
                {/* SVG com JPEG embutido — <img> evita duplicar o asset no JS do Next/Image. */}
                <img
                  src={LOGO_SRC}
                  alt={content.symbolismLogoAlt}
                  className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-200 ${active ? "opacity-[0.88]" : "opacity-100"}`}
                  loading="lazy"
                  decoding="async"
                />

                {active != null ? (
                  <div
                    className="pointer-events-none absolute z-[5] rounded-lg border-[3px] border-red-400 bg-red-500/25 shadow-[inset_0_0_32px_rgba(220,38,38,0.45),0_0_28px_rgba(248,113,113,0.35)]"
                    style={boxStyle(active)}
                    aria-hidden
                  />
                ) : null}

                {HOTSPOT_HIT_ORDER.map((id) => {
                  const on = active === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={[
                        "absolute z-10 rounded-lg border-0 bg-transparent transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                        on ? "bg-red-500/10" : "hover:bg-white/10",
                      ].join(" ")}
                      style={boxStyle(id)}
                      onClick={() => select(on ? null : id)}
                      onMouseEnter={() => select(id)}
                      onFocus={() => select(id)}
                      aria-label={content[FIELD[id].title]}
                      aria-pressed={on}
                    />
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-zinc-500">{content.symbolismHint}</p>
          </div>

          <div className="order-3 flex flex-col gap-2.5 lg:pt-4">{RIGHT_COL.map(chip)}</div>
        </div>

        <div className="mx-auto mt-10 max-w-2xl lg:mt-12">{panel}</div>
      </div>
    </section>
  );
}
