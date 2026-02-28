"use client";

import Link from "next/link";
import { getBeltName } from "@/lib/belts";

type Props = {
  backHref: string;
  backLabel?: string;
  /** Nível (1-based) para exibição. */
  level?: number;
  /** Índice da faixa (0 = Branca, 12+ = Dourado 1, 2, …). */
  rankIndex?: number;
  /** XP atual dentro da faixa (para a barra). */
  xpCurrent?: number;
  /** XP necessária para subir de faixa (para a barra). */
  xpNext?: number;
};

export function FighterHeader({
  backHref,
  backLabel = "Voltar",
  level = 1,
  rankIndex = 0,
  xpCurrent = 0,
  xpNext = 1000,
}: Props) {
  const beltName = getBeltName(rankIndex ?? 0);
  const xpPercent = xpNext > 0 ? Math.min(100, ((xpCurrent ?? 0) / xpNext) * 100) : 0;

  return (
    <header className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={backHref}
            className="text-sm font-medium text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
          >
            ← {backLabel}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Perfil do Atleta
          </h1>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg bg-primary text-white text-sm font-bold"
              title="Nível"
            >
              {level}
            </span>
            <span className="text-sm font-semibold text-primary border border-primary/50 rounded-lg px-2 py-1">
              {beltName}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>XP</span>
            <span>
              {xpCurrent}/{xpNext}
            </span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
