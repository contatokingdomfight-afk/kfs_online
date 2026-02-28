"use client";

import { FighterHeader } from "./FighterHeader";
import { StatCard } from "./StatCard";
import { RadarStats } from "./RadarStats";
import { AttributeAccordion } from "./AttributeAccordion";
import { MissionCard, type Mission } from "./MissionCard";
import { CoachFeedback } from "./CoachFeedback";
import type { DimensionDetail } from "@/lib/performance-detail-structure";
import type { RadarAxis } from "./RadarStats";
import { XP_PER_MISSION } from "@/lib/xp-missions";

const AXIS_ICONS: Record<string, string> = {
  tecnico: "🥊",
  tatico: "🎯",
  fisico: "💪",
  mental: "🧠",
  teorico: "📚",
};

function buildMissionsFromScores(
  scores: Record<string, number>,
  axes: RadarAxis[],
  maxScore: number
): Mission[] {
  const entries = axes
    .map((a) => ({ id: a.id, label: a.label, score: scores[a.id] ?? 0 }))
    .filter((e) => e.score < maxScore)
    .sort((a, b) => a.score - b.score);
  return entries.slice(0, 3).map((e) => ({
    id: e.id,
    target: `Subir ${e.label} para ${Math.min(maxScore, Math.ceil(e.score) + 1)}`,
    xpReward: XP_PER_MISSION,
    progress: Math.min(100, (e.score / maxScore) * 100 + 15),
  }));
}

type Props = {
  backHref: string;
  backLabel?: string;
  scores: Record<string, number>;
  detailOrder: string[];
  detailSource: Record<string, DimensionDetail>;
  axes: RadarAxis[];
  maxScore?: number;
  /** Nível e XP (gamificação). Se não passados, usam valores por defeito. */
  level?: number;
  rankIndex?: number;
  xpCurrent?: number;
  xpNext?: number;
  customMissions?: { id: string; name: string; description: string | null; xpReward: number }[];
  primaryModalityLabel?: string | null;
  /** Missão obrigatória: realizar/renovar avaliação física (aparece quando em falta ou >6 meses). */
  physicalAssessmentMission?: { id: string; name: string; description: string | null; xpReward: number } | null;
  coachFeedback?: string;
  coachName?: string;
};

export function PerformanceFighterDashboard({
  backHref,
  backLabel,
  scores,
  detailOrder,
  detailSource,
  axes,
  maxScore = 10,
  level,
  rankIndex,
  xpCurrent,
  xpNext,
  customMissions = [],
  primaryModalityLabel = null,
  physicalAssessmentMission = null,
  coachFeedback,
  coachName,
}: Props) {
  const systemMissions = buildMissionsFromScores(scores, axes, maxScore);
  const customAsMissions: Mission[] = customMissions.map((c) => ({
    id: `custom-${c.id}`,
    target: c.name,
    xpReward: c.xpReward,
    progress: 0,
  }));
  const physicalMission: Mission[] = physicalAssessmentMission
    ? [{ id: physicalAssessmentMission.id, target: physicalAssessmentMission.name, xpReward: physicalAssessmentMission.xpReward, progress: 0 }]
    : [];
  const missions = [...physicalMission, ...systemMissions, ...customAsMissions];
  const mediaGeral =
    axes.length > 0
      ? axes.reduce((s, a) => s + (scores[a.id] ?? 0), 0) / axes.length
      : 0;

  return (
    <div className="max-w-[min(720px,100%)] mx-auto space-y-6 pb-8">
      <FighterHeader
        backHref={backHref}
        backLabel={backLabel}
        level={level}
        rankIndex={rankIndex}
        xpCurrent={xpCurrent}
        xpNext={xpNext}
      />

      {/* Status gerais – stat cards */}
      <section>
        <h2 className="text-lg font-bold text-text-primary mb-3">Atributos principais</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {axes.map((a) => (
            <StatCard
              key={a.id}
              icon={<span aria-hidden>{AXIS_ICONS[a.id] ?? "•"}</span>}
              label={a.label}
              score={scores[a.id] ?? 0}
              maxScore={maxScore}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          Média geral: <span className="font-semibold text-primary">{mediaGeral.toFixed(1)}/10</span>
        </p>
      </section>

      {/* Radar */}
      <RadarStats scores={scores} axes={axes} maxScore={maxScore} />

      {/* Accordion por dimensão */}
      <AttributeAccordion
        detailOrder={detailOrder}
        detailSource={detailSource}
        scores={scores}
        maxScore={maxScore}
        primaryModalityLabel={primaryModalityLabel}
      />

      {/* Missões */}
      <MissionCard missions={missions} />

      {/* Coach feedback */}
      <CoachFeedback
        quote={
          coachFeedback ??
          "Continua a treinar com consistência. Foca nos atributos mais baixos para equilibrar o teu perfil."
        }
        coachName={coachName}
      />
    </div>
  );
}
