"use client";

import Link from "next/link";
import { FighterHeader } from "./FighterHeader";
import { StatCard } from "./StatCard";
import { RadarStats } from "./RadarStatsDynamic";
import { AttributeAccordion } from "./AttributeAccordion";
import { MissionCard, type Mission } from "./MissionCard";
import { CoachFeedback } from "./CoachFeedback";
import type { DimensionDetail } from "@/lib/performance-detail-structure";
import type { RadarAxis } from "./RadarStatsDynamic";
import { XP_PER_MISSION } from "@/lib/xp-missions";

const CATEGORY_LABEL: Record<string, string> = {
  TECHNIQUE: "Técnica",
  MINDSET: "Mindset",
  PERFORMANCE: "Performance",
};

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
  /** KPIs por modalidade (ex.: Muay Thai, Boxing) para secção "Performance por modalidade". */
  scoresByModality?: Record<string, Record<string, number>>;
  modalityLabels?: Record<string, string>;
  /** Cursos da biblioteca sugeridos (por modalidade principal); mostrados junto ao feedback do coach. */
  suggestedCourses?: { id: string; name: string; category: string; modality: string | null }[];
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
  scoresByModality,
  modalityLabels = {},
  suggestedCourses = [],
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

      {/* KPIs por modalidade */}
      {scoresByModality && Object.keys(scoresByModality).length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Performance por modalidade</h2>
          <p className="text-sm text-text-secondary mb-3">
            Média das últimas avaliações em cada modalidade (escala 1–10).
          </p>
          <div className="flex flex-col gap-4">
            {Object.entries(scoresByModality).map(([modCode, modScores]) => {
              const label = modalityLabels[modCode] ?? modCode;
              const avg =
                axes.length > 0
                  ? axes.reduce((s, a) => s + (modScores[a.id] ?? 0), 0) / axes.length
                  : 0;
              return (
                <div
                  key={modCode}
                  className="rounded-2xl bg-bg-secondary border border-border p-4 shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="font-semibold text-text-primary">{label}</span>
                    <span className="text-sm text-primary font-medium">{avg.toFixed(1)}/10</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {axes.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col rounded-lg bg-bg-primary/60 px-2 py-1.5 border border-border"
                      >
                        <span className="text-xs text-text-secondary">{a.label}</span>
                        <span className="text-sm font-semibold text-text-primary">
                          {(modScores[a.id] ?? 0).toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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

      {/* Conteúdos sugeridos (ligados ao contexto do feedback / modalidade) */}
      {suggestedCourses.length > 0 && (
        <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
          <h2 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
            <span aria-hidden>📚</span>
            Conteúdos sugeridos para ti
          </h2>
          <p className="text-sm text-text-secondary mb-3">
            Cursos da biblioteca que podem ajudar a evoluir no teu perfil. Combina com o feedback do treinador.
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {suggestedCourses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/biblioteca/${c.id}`}
                  className="block rounded-xl border border-border bg-bg-primary p-3 no-underline text-inherit hover:border-primary/50 transition-colors"
                >
                  <span className="font-medium text-text-primary">{c.name}</span>
                  <p className="text-xs text-text-secondary mt-1">
                    {CATEGORY_LABEL[c.category] ?? c.category}
                    {c.modality ? ` · ${modalityLabels[c.modality] ?? c.modality}` : ""}
                  </p>
                  <span className="text-xs text-primary font-medium mt-1 inline-block">
                    Ver curso →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/biblioteca"
            className="inline-block mt-3 text-sm font-medium text-primary no-underline hover:underline"
          >
            Ver toda a biblioteca →
          </Link>
        </section>
      )}
    </div>
  );
}
