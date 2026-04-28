"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { PhysicalAvatarCarouselPayload } from "@/lib/build-performance-physical-carousel";
import { PerformanceHeroCard } from "./PerformanceHeroCard";
import { StatCard } from "./StatCard";
import { RadarStats } from "./RadarStatsDynamic";
import { AttributeAccordion } from "./AttributeAccordion";
import { MissionCard, type Mission } from "./MissionCard";
import { CoachFeedback } from "./CoachFeedback";
import type { DimensionDetail } from "@/lib/performance-detail-structure";
import type { RadarAxis } from "./RadarStatsDynamic";
import { getRankNameForIndex } from "@/lib/xp-missions";
import { buildMissionsFromScores } from "@/lib/fighter-missions";
import { FALLBACK_COACH_ENCOURAGEMENT } from "@/lib/coach-feedback-defaults";
import { beltIdFromRankName } from "@/components/belt-progression/belt-progression-data";
import type { AchievementWithStatus } from "@/lib/achievements";
import { EvaluationResultsDashboard } from "@/components/evaluation-results";
import type { DimensionScore, CriterionScoreItem } from "@/lib/evaluation-results-data";
import type { BeltTimeGateInfo } from "@/lib/xp-missions";
import { CheckInWellnessSection, type CheckInWellnessCopy } from "@/components/fighter/CheckInWellnessSection";
import type { CheckInWellnessAggregates } from "@/lib/check-in-wellness-aggregates";
import {
  PerformanceRadarAvatarCarousel,
  PhysicalAssessmentBodyMapPanel,
} from "@/components/fighter/PerformanceRadarAvatarCarousel";

const BeltProgressionSection = dynamic(
  () => import("@/components/belt-progression").then((m) => ({ default: m.BeltProgressionSection })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-bg-secondary border border-border h-32 animate-pulse" />
    ),
  }
);

const ProfileAchievements = dynamic(
  () =>
    import("@/components/achievements/ProfileAchievements").then((m) => ({
      default: m.ProfileAchievements,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-bg-secondary border border-border h-24 animate-pulse" />
    ),
  }
);

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

type Props = {
  backHref: string;
  backLabel?: string;
  scores: Record<string, number>;
  detailOrder?: string[];
  detailSource?: Record<string, DimensionDetail>;
  axes: RadarAxis[];
  maxScore?: number;
  /** Nível e XP (gamificação). Se não passados, usam valores por defeito. */
  level?: number;
  rankIndex?: number;
  xpCurrent?: number;
  xpNext?: number;
  /** Trava de tempo na faixa (além do XP) para subir de nível. */
  beltTimeGate?: BeltTimeGateInfo;
  customMissions?: { id: string; name: string; description: string | null; xpReward: number }[];
  primaryModalityLabel?: string | null;
  /** Missão obrigatória: realizar/renovar avaliação física (aparece quando em falta ou >6 meses). */
  physicalAssessmentMission?: { id: string; name: string; description: string | null; xpReward: number } | null;
  coachFeedback?: string;
  coachName?: string;
  /** Quando o feedback vem da nota da última avaliação, não repetir o texto na secção «Última avaliação». */
  omitLastEvaluationNoteBody?: boolean;
  /** Última avaliação: treinador, data e nota (da tabela AthleteEvaluation). */
  lastEvaluation?: { coachName: string; date: string; note: string | null };
  /** URL para a página de histórico de avaliações (aluno ou coach). */
  evaluationsHistoryHref?: string;
  /** KPIs por modalidade (ex.: Muay Thai, Boxing) para secção "Performance por modalidade". */
  scoresByModality?: Record<string, Record<string, number>>;
  modalityLabels?: Record<string, string>;
  /** Cursos da biblioteca sugeridos (por modalidade principal); mostrados junto ao feedback do coach. */
  suggestedCourses?: { id: string; name: string; category: string; modality: string | null }[];
  /** Conquistas para a secção no perfil (badges desbloqueados e progresso). */
  profileAchievements?: AchievementWithStatus[];
  /** Dados para o dashboard de resultados de avaliação (resumo, pontos fortes/fracos, critérios por categoria). */
  evaluationResultsData?: {
    dimensionScores: DimensionScore[];
    criterionScores: CriterionScoreItem[];
    overallScore: number;
    scoresForRadar: Record<string, number>;
  } | null;
  /** Médias do questionário pré-treino (check-in). */
  checkInWellness?: { data: CheckInWellnessAggregates; copy: CheckInWellnessCopy };
  /** Radar + mapa corporal (2.º painel) a partir da última ficha física (ou convite se ainda não há ficha). */
  physicalAvatarCarousel?: PhysicalAvatarCarouselPayload | null;
  /** Link opcional para ver a ficha completa (área do aluno). */
  physicalFichaReadOnlyLink?: { href: string; label: string } | null;
  /** Dica sob o radar em modo só-radar (mapa na secção de dados biométricos). */
  physicalRadarOnlyHint?: string | null;
};

export function PerformanceFighterDashboard({
  backHref,
  backLabel,
  scores,
  detailOrder = [],
  detailSource = {},
  axes,
  maxScore = 10,
  level,
  rankIndex,
  xpCurrent,
  xpNext,
  beltTimeGate,
  customMissions = [],
  primaryModalityLabel = null,
  physicalAssessmentMission = null,
  coachFeedback,
  coachName,
  omitLastEvaluationNoteBody = false,
  lastEvaluation,
  evaluationsHistoryHref,
  scoresByModality,
  modalityLabels = {},
  suggestedCourses = [],
  profileAchievements,
  evaluationResultsData,
  checkInWellness,
  physicalAvatarCarousel = null,
  physicalFichaReadOnlyLink = null,
  physicalRadarOnlyHint = null,
}: Props) {
  const systemMissions: Mission[] = buildMissionsFromScores(scores, axes, maxScore);
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
      <PerformanceHeroCard
        backHref={backHref}
        backLabel={backLabel}
        overallScore={mediaGeral}
        maxScore={maxScore}
        level={level}
        rankIndex={rankIndex}
        xpCurrent={xpCurrent}
        xpNext={xpNext}
        primaryModalityLabel={primaryModalityLabel}
        xpBarNote={
          beltTimeGate?.waitingOnTime
            ? `Tempo na faixa: ${beltTimeGate.daysElapsedInBelt}/${beltTimeGate.minDaysRequired} dias (mín. ${beltTimeGate.minMonthsRequired} ${beltTimeGate.minMonthsRequired === 1 ? "mês" : "meses"}).`
            : undefined
        }
      />

      {/* Resultados de avaliação: resumo, radar, pontos fortes/fracos, filtros e critérios por categoria */}
      {evaluationResultsData ? (
        <EvaluationResultsDashboard
          dimensionScores={evaluationResultsData.dimensionScores}
          criterionScores={evaluationResultsData.criterionScores}
          overallScore={evaluationResultsData.overallScore}
          maxScore={maxScore}
          axes={axes}
          scoresForRadar={evaluationResultsData.scoresForRadar}
          modalityLabels={modalityLabels}
          scoresByModality={scoresByModality}
          physicalAvatarCarousel={physicalAvatarCarousel}
          physicalFichaReadOnlyLink={physicalFichaReadOnlyLink}
          physicalBodyMapOnlyInWellness={Boolean(checkInWellness)}
          physicalRadarOnlyHint={physicalRadarOnlyHint}
        />
      ) : (
        <>
          {/* Atributos – stat cards (fallback quando não há scores por critério) */}
          <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-bold text-text-primary uppercase tracking-wider">
                Atributos
              </h2>
              <span className="text-xs text-text-secondary">Performance geral 1–10</span>
            </div>
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
          </section>

          <div className="space-y-2">
            <PerformanceRadarAvatarCarousel
              radar={<RadarStats scores={scores} axes={axes} maxScore={maxScore} />}
              payload={physicalAvatarCarousel}
              radarOnly={Boolean(checkInWellness)}
              radarOnlyHint={checkInWellness ? physicalRadarOnlyHint : undefined}
            />
            {physicalFichaReadOnlyLink && !checkInWellness ? (
              <p className="m-0 text-center text-xs">
                <Link
                  href={physicalFichaReadOnlyLink.href}
                  className="font-medium text-[var(--primary)] no-underline hover:underline"
                >
                  {physicalFichaReadOnlyLink.label}
                </Link>
              </p>
            ) : null}
          </div>
        </>
      )}

      {/* KPIs por modalidade */}
      {scoresByModality && Object.keys(scoresByModality).length > 0 && (
        <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
          <h2 className="text-base font-bold text-text-primary uppercase tracking-wider mb-2">
            Performance por modalidade
          </h2>
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

      {/* Accordion por dimensão (só quando não estamos no novo dashboard de resultados) */}
      {!evaluationResultsData && (
        <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
          <h2 className="text-base font-bold text-text-primary uppercase tracking-wider mb-2">
            Detalhe por dimensão
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            {primaryModalityLabel
              ? `Secções por dimensão; dentro de cada uma, critérios da tua modalidade (${primaryModalityLabel}). Cada critério: nome, descrição, 1–5 estrelas e barra de progresso.`
              : "Secções por dimensão; dentro de cada uma, grupos por modalidade. Cada critério: nome, pergunta/descrição, 1–5 estrelas e barra opcional."}
          </p>
          <AttributeAccordion
            detailOrder={detailOrder}
            detailSource={detailSource}
            scores={scores}
            maxScore={maxScore}
            primaryModalityLabel={primaryModalityLabel}
          />
        </section>
      )}

      {/* Objetivos / Quests */}
      <MissionCard missions={missions} />

      {checkInWellness && (
        <CheckInWellnessSection
          data={checkInWellness.data}
          copy={checkInWellness.copy}
          bodyMappingSlot={
            <>
              {physicalAvatarCarousel ? (
                <PhysicalAssessmentBodyMapPanel payload={physicalAvatarCarousel} />
              ) : null}
              {physicalFichaReadOnlyLink ? (
                <p className="m-0 text-center text-xs sm:text-left">
                  <Link
                    href={physicalFichaReadOnlyLink.href}
                    className="font-medium text-[var(--primary)] no-underline hover:underline"
                  >
                    {physicalFichaReadOnlyLink.label}
                  </Link>
                </p>
              ) : null}
            </>
          }
        />
      )}

      {/* Progressão de Níveis e XP */}
      {xpCurrent != null && xpNext != null && rankIndex != null && (
        <BeltProgressionSection
          currentXP={xpCurrent}
          nextBeltXP={xpNext}
          currentBelt={beltIdFromRankName(getRankNameForIndex(rankIndex))}
          beltTimeGate={beltTimeGate}
        />
      )}

      {/* Conquistas – resumo e link */}
      {profileAchievements ? (
        <ProfileAchievements achievements={profileAchievements} backHref="/dashboard" />
      ) : (
        <Link
          href="/dashboard/conquistas"
          className="block rounded-2xl bg-bg-secondary border border-border p-4 shadow-md hover:border-primary/40 transition-colors no-underline text-inherit"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🏆</span>
              <div>
                <h2 className="text-base font-bold text-text-primary">Conquistas</h2>
                <p className="text-sm text-text-secondary">Badges e metas que já desbloqueaste</p>
              </div>
            </div>
            <span className="text-sm font-medium text-primary">Ver todas →</span>
          </div>
        </Link>
      )}

      {/* Última avaliação: treinador, data e comentário */}
      {lastEvaluation && (
        <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
          <h2 className="text-base font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
            <span aria-hidden>📋</span>
            Última avaliação
          </h2>
          <p className="text-sm text-text-secondary mb-1">
            Por <strong className="text-text-primary">{lastEvaluation.coachName}</strong>
            {lastEvaluation.date ? ` · ${lastEvaluation.date}` : ""}
          </p>
          {omitLastEvaluationNoteBody && lastEvaluation.note ? (
            <p className="text-sm text-text-secondary mt-2 italic">
              O comentário desta avaliação está destacado em «Feedback do treinador» abaixo.
            </p>
          ) : lastEvaluation.note ? (
            <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{lastEvaluation.note}</p>
          ) : (
            <p className="text-sm text-text-secondary italic">Sem comentário nesta avaliação.</p>
          )}
          {evaluationsHistoryHref && (
            <Link
              href={evaluationsHistoryHref}
              className="inline-block mt-3 text-sm font-medium text-primary no-underline hover:underline"
            >
              Ver histórico de avaliações →
            </Link>
          )}
        </section>
      )}

      {/* Coach feedback (comentário geral do treinador) */}
      <CoachFeedback
        quote={coachFeedback ?? FALLBACK_COACH_ENCOURAGEMENT}
        coachName={coachName}
      />

      {/* Conteúdos sugeridos (ligados ao contexto do feedback / modalidade) */}
      {suggestedCourses.length > 0 && (
        <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
          <h2 className="text-base font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
            <span aria-hidden>📚</span>
            Conteúdos para evoluir
          </h2>
          <p className="text-sm text-text-secondary mb-3">
            Cursos da biblioteca para subir de nível. Combina com o feedback do treinador.
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
