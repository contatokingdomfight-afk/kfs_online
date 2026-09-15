import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanAccess } from "@/lib/plan-access";
import { getMonthlyCheckInLimit } from "@/lib/monthly-checkin-limit";
import { normalizeModalityCode } from "@/lib/modality-normalize";
import type { DashboardLessonFilterInput } from "@/lib/dashboard-lesson-filter";
import {
  isStudentEligibleForCoachLesson,
  isStudentEligibleForDropInLesson,
  type CoachLessonContext,
} from "@/lib/coach-lesson-eligible-students";
import { isFamilyPlan } from "@/lib/kingdom-plans-constants";
import { loadFamilyReferencePlanIdByStudent } from "@/lib/family-effective-plan";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

type PlanRow = {
  id: string;
  name: string;
  modalityScope: string | null;
  includes_check_in: boolean | null;
  isActive: boolean | null;
  max_check_ins_per_month?: number | null;
};

type StudentRow = {
  id: string;
  userId: string;
  planId: string | null;
  primaryModality: string | null;
  status: string;
  competitionAthlete?: boolean;
};

export async function getDropInCreditsRemaining(
  supabase: SupabaseClient,
  studentId: string,
  referenceMonth: string,
  excludeLessonId?: string
): Promise<{ remaining: number; limit: number }> {
  const monthly = await getMonthlyCheckInLimit(supabase, studentId, 0, referenceMonth, excludeLessonId);
  return { remaining: monthly.remaining ?? 0, limit: monthly.limit ?? 0 };
}

/** RSVP / cartões do dashboard: aluno avulso com créditos actua como plano single-modality. */
export async function resolveDashboardParticipationAccess(
  supabase: SupabaseClient,
  studentId: string | null,
  referenceMonth: string,
  planAccess: Awaited<ReturnType<typeof getPlanAccess>>,
  studentPrimaryModality: string | null,
  hasSubscriptionPlan: boolean
): Promise<{
  effectiveHasCheckIn: boolean;
  effectiveHasPlan: boolean;
  hasDropInCredits: boolean;
  effectiveAllowedModalities: string[];
  planFilterInput: DashboardLessonFilterInput;
}> {
  let effectiveHasCheckIn = planAccess.hasCheckIn;
  let effectiveHasPlan = hasSubscriptionPlan;
  let effectiveAllowedModalities = planAccess.allowedModalities;
  let hasDropInCredits = false;

  if (!planAccess.hasCheckIn && studentId && studentPrimaryModality) {
    const { remaining } = await getDropInCreditsRemaining(supabase, studentId, referenceMonth);
    if (remaining > 0) {
      hasDropInCredits = true;
      effectiveHasCheckIn = true;
      effectiveHasPlan = true;
      effectiveAllowedModalities = [studentPrimaryModality];
    }
  }

  return {
    effectiveHasCheckIn,
    effectiveHasPlan,
    hasDropInCredits,
    effectiveAllowedModalities,
    planFilterInput: {
      hasPlan: effectiveHasPlan,
      hasCheckIn: effectiveHasCheckIn,
      allowedModalities: effectiveAllowedModalities,
      studentPrimaryModality,
      modalitiesListLength: MODALITIES_LIST.length,
    },
  };
}

/** Limite mensal (plano com cap ou créditos avulsos). */
export async function assertStudentMonthlyCheckInAllowed(
  supabase: SupabaseClient,
  studentId: string,
  occurrenceYmd: string,
  lessonId?: string
): Promise<{ error?: string }> {
  const planAccess = await getPlanAccess(supabase, studentId);
  const referenceMonth = occurrenceYmd.slice(0, 7);

  if (planAccess.hasCheckIn) {
    if (planAccess.maxCheckInsPerMonth === null) return {};
    const monthly = await getMonthlyCheckInLimit(
      supabase,
      studentId,
      planAccess.maxCheckInsPerMonth,
      referenceMonth,
      lessonId
    );
    if ((monthly.remaining ?? 0) <= 0) {
      return { error: `Este aluno já usou as ${monthly.limit} aulas do plano este mês.` };
    }
    return {};
  }

  const dropIn = await getMonthlyCheckInLimit(supabase, studentId, 0, referenceMonth, lessonId);
  if ((dropIn.remaining ?? 0) <= 0) {
    return { error: "Este aluno não tem aulas avulsas disponíveis este mês." };
  }
  return {};
}

/** RSVP «Vou / Não vou» para aluno só com créditos avulsos. */
export async function assertStudentCanSetLessonIntention(
  supabase: SupabaseClient,
  studentId: string,
  params: {
    isOpenClass: boolean;
    modality: string;
    occurrenceYmd: string;
    lessonId: string;
  }
): Promise<{ error?: string }> {
  const planAccess = await getPlanAccess(supabase, studentId);
  if (planAccess.hasCheckIn || params.isOpenClass) return {};

  const { data: student } = await supabase
    .from("Student")
    .select("primaryModality, status")
    .eq("id", studentId)
    .maybeSingle();
  if ((student as { status?: string } | null)?.status !== "ATIVO") {
    return { error: "Conta inactiva." };
  }

  const mod = normalizeModalityCode((student as { primaryModality?: string | null } | null)?.primaryModality);
  if (!mod) return { error: "Modalidade não definida na tua ficha. Contacta a receção." };
  if (params.modality !== mod) {
    return { error: "Só podes marcar presença na tua modalidade ou em aulas livres." };
  }

  const dropIn = await getMonthlyCheckInLimit(
    supabase,
    studentId,
    0,
    params.occurrenceYmd.slice(0, 7),
    params.lessonId
  );
  if ((dropIn.remaining ?? 0) <= 0) {
    return { error: "Não tens aulas avulsas disponíveis este mês. Fala com a secretaria." };
  }
  return {};
}

async function loadStudentPlanForCoachCheckIn(
  supabase: SupabaseClient,
  student: StudentRow
): Promise<PlanRow | undefined> {
  if (!student.planId) return undefined;
  const effectivePlanId = isFamilyPlan(student.planId)
    ? (await loadFamilyReferencePlanIdByStudent(supabase, [student.id])).get(student.id)
    : student.planId;
  if (!effectivePlanId) return undefined;
  const { data: planRow } = await supabase
    .from("Plan")
    .select("id, name, modalityScope, includes_check_in, isActive, max_check_ins_per_month")
    .eq("id", effectivePlanId)
    .maybeSingle();
  return planRow as PlanRow | undefined;
}

/** Elegibilidade para o coach marcar presença (plano normal ou avulso com créditos). */
export async function assertStudentEligibleForCoachLessonCheckIn(
  supabase: SupabaseClient,
  studentId: string,
  params: Omit<CoachLessonContext, "occurrenceYmd"> & { lessonId: string; occurrenceYmd: string }
): Promise<{ error?: string; student?: StudentRow; plan?: PlanRow }> {
  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, planId, primaryModality, status, schoolId, competitionAthlete")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return { error: "Aluno não encontrado." };
  if ((student as { schoolId?: string }).schoolId !== params.schoolId) {
    return { error: "Este aluno não pertence à escola desta aula." };
  }

  const row = student as StudentRow;
  if (row.status !== "ATIVO") return { error: "Só alunos ativos podem ser marcados presentes." };

  const plan = await loadStudentPlanForCoachCheckIn(supabase, row);
  const lessonCtx = {
    modality: params.modality,
    isOpenClass: params.isOpenClass,
    athletesOnly: params.athletesOnly,
  };

  if (isStudentEligibleForCoachLesson(row, plan, lessonCtx)) {
    return { student: row, plan };
  }

  const planAccess = await getPlanAccess(supabase, studentId);
  if (!planAccess.hasCheckIn && isStudentEligibleForDropInLesson(row, lessonCtx)) {
    const referenceMonth = params.occurrenceYmd.slice(0, 7);
    const { remaining } = await getDropInCreditsRemaining(supabase, studentId, referenceMonth, params.lessonId);
    if (remaining > 0) return { student: row, plan };
    return { error: "Este aluno não tem aulas avulsas disponíveis este mês." };
  }

  return {
    error:
      params.athletesOnly && !row.competitionAthlete
        ? "Esta aula é só para atletas de competição."
        : "Este aluno não está elegível para esta aula (plano ou modalidade).",
  };
}
