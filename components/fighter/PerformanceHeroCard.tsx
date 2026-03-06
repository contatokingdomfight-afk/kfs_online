"use client";

import Link from "next/link";
import { getBeltName } from "@/lib/belts";

type Props = {
  backHref: string;
  backLabel?: string;
  /** Média geral 1–10 (exibida como "OVR" no centro do gauge). */
  overallScore: number;
  maxScore?: number;
  level?: number;
  rankIndex?: number;
  xpCurrent?: number;
  xpNext?: number;
  /** Ex.: "Muay Thai" para badge de modalidade. */
  primaryModalityLabel?: string | null;
};

export function PerformanceHeroCard({
  backHref,
  backLabel = "Voltar",
  overallScore,
  maxScore = 10,
  level = 1,
  rankIndex = 0,
  xpCurrent = 0,
  xpNext = 1000,
  primaryModalityLabel,
}: Props) {
  const beltName = getBeltName(rankIndex ?? 0);
  const normalized = Math.min(maxScore, Math.max(0, overallScore));
  const percent = maxScore > 0 ? (normalized / maxScore) * 100 : 0;
  const xpPercent = xpNext > 0 ? Math.min(100, ((xpCurrent ?? 0) / xpNext) * 100) : 0;

  return (
    <header className="relative rounded-2xl overflow-hidden border border-border shadow-lg bg-bg-secondary">
      {/* Subtle gradient overlay for "card" feel */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, var(--primary), transparent)",
        }}
      />
      <div className="relative p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={backHref}
              className="text-sm font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
            >
              ← {backLabel}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            {/* Circular gauge – "OVR" / Média */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(var(--primary) 0% ${percent}%, var(--border) ${percent}% 100%)`,
                }}
              >
                <div className="absolute inset-[6px] sm:inset-[8px] rounded-full bg-bg-secondary flex items-center justify-center">
                  <div className="text-center">
                    <span className="block text-2xl sm:text-3xl font-bold tabular-nums text-text-primary leading-none">
                      {normalized.toFixed(1)}
                    </span>
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Média
                    </span>
                  </div>
                </div>
              </div>
              <span className="mt-2 text-xs text-text-secondary">1–10</span>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                Perfil do Atleta
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg bg-primary text-white text-sm font-bold"
                  title="Nível"
                >
                  {level}
                </span>
                <span className="text-sm font-semibold text-primary border border-primary/50 rounded-lg px-2 py-1">
                  {beltName}
                </span>
                {primaryModalityLabel && (
                  <span className="text-xs text-text-secondary border border-border rounded-lg px-2 py-1">
                    {primaryModalityLabel}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>XP para próximo nível</span>
                  <span className="tabular-nums">
                    {xpCurrent}/{xpNext}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
