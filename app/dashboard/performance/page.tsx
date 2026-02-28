import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { GENERAL_PERFORMANCE_AXES, computeGeneralPerformanceScores } from "@/lib/performance-utils";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";
import { PerformanceFighterDashboard } from "@/components/fighter/PerformanceFighterDashboard";
import {
  PERFORMANCE_DETAIL_BY_DIMENSION,
  PERFORMANCE_DETAIL_ORDER,
} from "@/lib/performance-detail-structure";
import {
  buildPerformanceDetailFromConfigs,
  getDetailOrder,
} from "@/lib/performance-detail-from-config";
import { getRankFromXp } from "@/lib/xp-missions";
import { getApplicableMissionTemplates } from "@/lib/missions";

const GENERAL_LAST_N = 10;

export const dynamic = "force-dynamic";

export default async function DashboardPerformancePage() {
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();

  const { data: modalitiesList } = await supabase.from("ModalityRef").select("code, name").order("sortOrder", { ascending: true });
  const modalityLabels = new Map<string, string>((modalitiesList ?? []).map((m) => [m.code, m.name ?? m.code]));

  const configsForDetail: { modality: string; config: import("@/lib/evaluation-config").ModalityEvaluationConfigPayload }[] = [];
  const configByModality = new Map<string, { criterionToCategory: Map<string, string>; criterionToDimensionCode?: Map<string, string> }>();
  for (const mod of modalitiesList ?? []) {
    const config = await loadEvaluationConfigForModality(supabase, mod.code);
    if (config) {
      configByModality.set(mod.code, {
        criterionToCategory: getCriterionToCategory(config),
        criterionToDimensionCode: getCriterionToDimensionCode(config),
      });
      configsForDetail.push({ modality: mod.code, config });
    }
  }

  let generalPerformanceScores: Record<string, number> | null = null;
  let rankInfo: { level: number; rankIndex: number; xpCurrent: number; xpNext: number } | null = null;
  let customMissions: { id: string; name: string; description: string | null; xpReward: number }[] = [];
  let primaryModalityLabel: string | null = null;
  let physicalAssessmentDue = false;
  let lastPhysicalAssessment: { assessedAt: string; nextDueAt: string | null } | null = null;
  let coachFeedback: string | null = null;
  let coachName: string | null = null;
  if (studentId) {
    const { data: athlete } = await supabase.from("Athlete").select("id, xp").eq("studentId", studentId).single();
    if (athlete) {
      const xp = (athlete.xp as number | null) ?? 0;
      const rank = getRankFromXp(xp);
      rankInfo = { level: rank.level, rankIndex: rank.rankIndex, xpCurrent: rank.xpCurrent, xpNext: rank.xpNext };
      const { data: student } = await supabase.from("Student").select("primaryModality").eq("id", studentId).single();
      const primaryModality = (student?.primaryModality as string | null) ?? null;
      primaryModalityLabel = primaryModality ? (modalityLabels.get(primaryModality) ?? primaryModality) : null;
      customMissions = (await getApplicableMissionTemplates(supabase, athlete.id, xp, primaryModality)).map(
        (t) => ({ id: t.id, name: t.name, description: t.description, xpReward: t.xpReward })
      );
      const { data: latestComment } = await supabase
        .from("Comment")
        .select("content, authorCoachId")
        .eq("targetType", "ATHLETE")
        .eq("targetId", athlete.id)
        .eq("visibility", "SHARED")
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestComment?.content) {
        coachFeedback = latestComment.content;
        const { data: coach } = await supabase.from("Coach").select("userId").eq("id", latestComment.authorCoachId).single();
        if (coach) {
          const { data: user } = await supabase.from("User").select("name").eq("id", coach.userId).single();
          coachName = user?.name ?? "Treinador";
        } else {
          coachName = "Treinador";
        }
      }
      const { data: lastPhys } = await supabase
        .from("StudentPhysicalAssessment")
        .select("assessedAt, nextDueAt")
        .eq("studentId", studentId)
        .order("assessedAt", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastPhysicalAssessment = lastPhys ?? null;
      const today = new Date().toISOString().slice(0, 10);
      physicalAssessmentDue =
        !lastPhysicalAssessment || (lastPhysicalAssessment.nextDueAt != null && lastPhysicalAssessment.nextDueAt <= today);
      const { data: evalsRows } = await supabase
        .from("AthleteEvaluation")
        .select("gas, technique, strength, theory, scores, modality")
        .eq("athleteId", athlete.id)
        .order("created_at", { ascending: false })
        .limit(GENERAL_LAST_N);
      const evaluations = (evalsRows ?? []).map((e) => ({
        gas: e.gas,
        technique: e.technique,
        strength: e.strength,
        theory: e.theory,
        scores: e.scores as Record<string, number> | null,
        modality: e.modality,
      }));

      if (evaluations.length > 0) {
        generalPerformanceScores = computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true);
      }
    }
  }

  const detailByDimension = buildPerformanceDetailFromConfigs(configsForDetail, modalityLabels);
  const useStaticDetail = Object.keys(detailByDimension).length === 0;
  const detailSource = useStaticDetail ? PERFORMANCE_DETAIL_BY_DIMENSION : detailByDimension;
  const detailOrder = useStaticDetail ? [...PERFORMANCE_DETAIL_ORDER] : getDetailOrder(detailByDimension);

  const hasScores = generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0;

  if (!hasScores) {
    return (
      <div className="max-w-[min(720px,100%)] mx-auto">
        <div className="rounded-2xl bg-bg-secondary border border-border p-6 shadow-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">Perfil do Atleta</h1>
          <p className="text-base text-text-secondary mb-4">
            Ainda não tens avaliações registadas. Quando o teu treinador preencher avaliações nas aulas, aqui poderás ver a tua performance geral, atributos e missões.
          </p>
          <Link href="/dashboard" className="btn btn-primary inline-block no-underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PerformanceFighterDashboard
      backHref="/dashboard"
      backLabel="Voltar ao início"
      scores={generalPerformanceScores}
      detailOrder={detailOrder}
      detailSource={detailSource}
      axes={[...GENERAL_PERFORMANCE_AXES]}
      maxScore={10}
      level={rankInfo?.level}
      rankIndex={rankInfo?.rankIndex}
      xpCurrent={rankInfo?.xpCurrent}
      xpNext={rankInfo?.xpNext}
      customMissions={customMissions}
      primaryModalityLabel={primaryModalityLabel}
      physicalAssessmentMission={
        physicalAssessmentDue
          ? { id: "physical-assessment", name: lastPhysicalAssessment ? "Renovar avaliação física (obrigatório a cada 6 meses)" : "Realizar avaliação física", description: "Solicita ao teu instrutor a ficha de anamnese e avaliação física.", xpReward: 0 }
          : null
      }
      coachFeedback={coachFeedback ?? undefined}
      coachName={coachName ?? undefined}
    />
  );
}
