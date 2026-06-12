"use client";

import Image from "next/image";
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
 * Áreas sobre o logótipo completo (transparent.png: coroa + octógono + lutador + texto).
 * Percentagens do contentor quadrado — afinar se trocar o PNG.
 */
const HOTSPOTS: Record<ItemId, { top: string; left: string; width: string; height: string }> = {
  crown: { top: "2%", left: "20%", width: "60%", height: "12%" },
  octagon: { top: "12%", left: "14%", width: "72%", height: "22%" },
  fighter: { top: "22%", left: "18%", width: "64%", height: "34%" },
  colors: { top: "18%", left: "4%", width: "24%", height: "40%" },
  blood: { top: "48%", left: "12%", width: "76%", height: "22%" },
  prophecy: { top: "62%", left: "48%", width: "48%", height: "32%" },
};

/** Logótipo completo (emblem.png é só a coroa — não usar nesta secção). */
const LOGO_SRC = "/brand/kfs-logotipo-transparent.png";

export function LogoSymbolismSection({ content }: { content: HomeContent }) {
  const uid = useId();
  const [active, setActive] = useState<ItemId | null>(null);

  const select = useCallback((id: ItemId | null) => {
    setActive(id);
  }, []);

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

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_minmax(0,1fr)] lg:items-start">
          <div className="order-2 flex flex-col gap-2.5 lg:order-1 lg:pt-4">{LEFT_COL.map(chip)}</div>

          <div className="order-1 mx-auto w-full max-w-[280px] sm:max-w-sm lg:order-2">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-700/80 bg-gradient-to-br from-zinc-900 to-black shadow-[0_20px_60px_rgba(0,0,0,0.65)] ring-1 ring-red-900/20"
            >
              <Image
                src={LOGO_SRC}
                alt={content.symbolismLogoAlt}
                fill
                sizes="(max-width: 1024px) 90vw, 320px"
                className="object-contain p-3 sm:p-4"
                priority={false}
              />
              {(Object.keys(HOTSPOTS) as ItemId[]).map((id) => {
                const z = HOTSPOTS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={[
                      "absolute z-10 rounded-lg border-0 bg-transparent transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                      active === id
                        ? "bg-red-500/15 ring-2 ring-red-400/50"
                        : "hover:bg-white/5",
                    ].join(" ")}
                    style={{ top: z.top, left: z.left, width: z.width, height: z.height }}
                    onClick={() => select(active === id ? null : id)}
                    onMouseEnter={() => select(id)}
                    onFocus={() => select(id)}
                    aria-label={content[FIELD[id].title]}
                    aria-pressed={active === id}
                  />
                );
              })}
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
