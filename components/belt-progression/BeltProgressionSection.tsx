"use client";

import { CurrentBeltCard } from "./CurrentBeltCard";
import { BeltTimeline } from "./BeltTimeline";
import { ProgressionPath } from "./ProgressionPath";
import type { BeltId } from "./belt-progression-data";
import type { BeltTimeGateInfo } from "@/lib/xp-missions";

export type BeltProgressionSectionProps = {
  currentXP?: number;
  nextBeltXP?: number;
  currentBelt?: BeltId;
  beltTimeGate?: BeltTimeGateInfo;
};

const DEFAULT_CURRENT_XP = 72_300;
const DEFAULT_NEXT_BELT_XP = 127_000;
const DEFAULT_CURRENT_BELT: BeltId = "Azul";

export function BeltProgressionSection({
  currentXP = DEFAULT_CURRENT_XP,
  nextBeltXP = DEFAULT_NEXT_BELT_XP,
  currentBelt = DEFAULT_CURRENT_BELT,
  beltTimeGate,
}: BeltProgressionSectionProps) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 sm:p-6 shadow-lg space-y-6"
      aria-labelledby="belt-progression-heading"
    >
      <h2
        id="belt-progression-heading"
        className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
      >
        Progressão de níveis e XP
      </h2>

      <CurrentBeltCard
        currentBelt={currentBelt}
        currentXP={currentXP}
        nextBeltXP={nextBeltXP}
        beltTimeGate={beltTimeGate}
      />

      <BeltTimeline currentBelt={currentBelt} />

      <div className="rounded-2xl border border-[var(--border)]/80 bg-[var(--bg)]/50 p-4 sm:p-6">
        <ProgressionPath currentBelt={currentBelt} />
      </div>
    </section>
  );
}
