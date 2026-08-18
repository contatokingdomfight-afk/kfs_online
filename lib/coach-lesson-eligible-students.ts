import type { SupabaseClient } from "@supabase/supabase-js";
import { isLessonParticipationAllowedByPlan } from "@/lib/dashboard-lesson-filter";
import { isFamilyPlan } from "@/lib/kingdom-plans-constants";
import { loadFamilyReferencePlanIdByStudent } from "@/lib/family-effective-plan";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

export type CoachLessonWellnessZone = "GREEN" | "YELLOW" | "RED";

export type CoachLessonStudentRow = {
  studentId: string;
  name: string | null;
  email: string;
  planLabel: string | null;
  attendanceId: string | null;
  status: string | null;
  checkedInAt: string | null;
  avatarUrl: string | null;
  phone: string | null;
  weightKg: number | null;
  heightCm: number | null;
  medicalNotes: string | null;
  emergencyContact: string | null;
  evaluatedInThisLesson: boolean;
  lastEvalScoresByModality?: Record<string, Record<string, number>>;
  preLessonWellness: { zone: CoachLessonWellnessZone; tooltip: string } | null;
  rpe: number | null;
  rpeRecordedAt: string | null;
  /** null quando o plano não tem limite mensal de check-ins. */
  monthlyLimit: { used: number; limit: number; remaining: number } | null;
};

export type CoachLessonContext = {
  lessonId: string;
  occurrenceYmd: string;
  schoolId: string;
  modality: string;
  isOpenClass: boolean;
};

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
};

function buildPlanAccessInput(
  student: StudentRow,
  plan: PlanRow | undefined
): {
  hasPlan: boolean;
  hasCheckIn: boolean;
  allowedModalities: string[];
  studentPrimaryModality: string | null;
  modalitiesListLength: number;
} {
  if (!student.planId || !plan || plan.isActive === false) {
    return {
      hasPlan: false,
      hasCheckIn: false,
      allowedModalities: [],
      studentPrimaryModality: null,
      modalitiesListLength: MODALITIES_LIST.length,
    };
  }

  const modalityScope = plan.modalityScope ?? "NONE";
  const primaryModality = student.primaryModality ?? null;

  let allowedModalities: string[] = [];
  if (modalityScope === "NONE") {
    allowedModalities = [];
  } else if (modalityScope === "SINGLE" && primaryModality) {
    allowedModalities = [primaryModality];
  } else {
    allowedModalities = [...MODALITIES_LIST];
  }

  return {
    hasPlan: true,
    hasCheckIn: (plan.includes_check_in ?? true) === true,
    allowedModalities,
    studentPrimaryModality: primaryModality,
    modalitiesListLength: MODALITIES_LIST.length,
  };
}

/** Verifica se o aluno (dados em memória) pode participar nesta aula. */
export function isStudentEligibleForCoachLesson(
  student: StudentRow,
  plan: PlanRow | undefined,
  lesson: Pick<CoachLessonContext, "modality" | "isOpenClass">
): boolean {
  if (student.status !== "ATIVO") return false;
  const access = buildPlanAccessInput(student, plan);
  return isLessonParticipationAllowedByPlan(
    {
      modality: lesson.modality,
      isOpenClass: lesson.isOpenClass,
    },
    access
  );
}

function rosterSortRank(status: string | null): number {
  if (status === "CONFIRMED") return 0;
  if (status === "PENDING") return 1;
  if (status == null) return 2;
  if (status === "ABSENT") return 3;
  return 4;
}

function compareRosterRows(a: CoachLessonStudentRow, b: CoachLessonStudentRow): number {
  const rank = rosterSortRank(a.status) - rosterSortRank(b.status);
  if (rank !== 0) return rank;
  const nameA = (a.name ?? a.email).toLowerCase();
  const nameB = (b.name ?? b.email).toLowerCase();
  return nameA.localeCompare(nameB, "pt");
}

export type LoadCoachLessonRosterParams = CoachLessonContext;

/**
 * Lista alunos ATIVOS da escola elegíveis para a aula (plano/modalidade),
 * unidos com Attendance da ocorrência.
 */
export async function loadCoachLessonRoster(
  supabase: SupabaseClient,
  params: LoadCoachLessonRosterParams
): Promise<{ students: CoachLessonStudentRow[] }> {
  const { lessonId, occurrenceYmd, schoolId, modality, isOpenClass } = params;

  const [{ data: schoolStudents }, { data: attList }] = await Promise.all([
    supabase
      .from("Student")
      .select("id, userId, planId, primaryModality, status")
      .eq("schoolId", schoolId)
      .eq("status", "ATIVO"),
    supabase
      .from("Attendance")
      .select("id, studentId, status, checkedInAt, rpe, rpeRecordedAt")
      .eq("lessonId", lessonId)
      .eq("occurrenceDate", occurrenceYmd),
  ]);

  const students = (schoolStudents ?? []) as StudentRow[];
  if (students.length === 0) {
    return { students: [] };
  }

  const planIds = [...new Set(students.map((s) => s.planId).filter(Boolean))] as string[];
  const familyStudentIds = students
    .filter((s) => s.planId && isFamilyPlan(s.planId))
    .map((s) => s.id);
  const referencePlanIdByStudent = await loadFamilyReferencePlanIdByStudent(supabase, familyStudentIds);
  const allPlanIds = [
    ...new Set([...planIds, ...referencePlanIdByStudent.values()]),
  ];
  const { data: plans } =
    allPlanIds.length > 0
      ? await supabase
          .from("Plan")
          .select("id, name, modalityScope, includes_check_in, isActive, max_check_ins_per_month")
          .in("id", allPlanIds)
      : { data: [] as PlanRow[] };

  const planById = new Map((plans ?? []).map((p) => [p.id, p as PlanRow]));

  const planForStudent = (student: StudentRow): PlanRow | undefined => {
    if (!student.planId) return undefined;
    if (isFamilyPlan(student.planId)) {
      const refId = referencePlanIdByStudent.get(student.id);
      return refId ? planById.get(refId) : undefined;
    }
    return planById.get(student.planId);
  };

  const eligibleIds = students
    .filter((s) => isStudentEligibleForCoachLesson(s, planForStudent(s), { modality, isOpenClass }))
    .map((s) => s.id);

  if (eligibleIds.length === 0) {
    return { students: [] };
  }

  const attendanceByStudent = new Map(
    (attList ?? []).map((a) => [
      a.studentId as string,
      a as {
        id: string;
        studentId: string;
        status: string;
        checkedInAt: string | null;
        rpe: number | null;
        rpeRecordedAt: string | null;
      },
    ])
  );

  const eligibleStudents = students.filter((s) => eligibleIds.includes(s.id));
  const userIds = [...new Set(eligibleStudents.map((s) => s.userId))];

  const referenceMonth = currentReferenceMonthLisbon(new Date());
  const monthlyCapStudentIds = eligibleStudents
    .filter((s) => (planForStudent(s)?.max_check_ins_per_month ?? null) !== null)
    .map((s) => s.id);

  const monthlyLimitByStudent = new Map<string, { used: number; limit: number; remaining: number }>();
  if (monthlyCapStudentIds.length > 0) {
    const [ry, rm] = referenceMonth.split("-").map(Number);
    const lastDay = new Date(ry, rm, 0).getDate();
    const monthStart = `${referenceMonth}-01`;
    const monthEnd = `${referenceMonth}-${String(lastDay).padStart(2, "0")}`;

    const [{ data: monthAtt }, { data: extraRows }] = await Promise.all([
      supabase
        .from("Attendance")
        .select("studentId")
        .in("studentId", monthlyCapStudentIds)
        .eq("status", "CONFIRMED")
        .gte("occurrenceDate", monthStart)
        .lte("occurrenceDate", monthEnd),
      supabase
        .from("StudentExtraSessions")
        .select("studentId, quantity")
        .in("studentId", monthlyCapStudentIds)
        .eq("referenceMonth", referenceMonth),
    ]);

    const usedByStudent = new Map<string, number>();
    for (const row of monthAtt ?? []) {
      const sid = (row as { studentId: string }).studentId;
      usedByStudent.set(sid, (usedByStudent.get(sid) ?? 0) + 1);
    }
    const extraByStudent = new Map<string, number>();
    for (const row of extraRows ?? []) {
      const r = row as { studentId: string; quantity: number };
      extraByStudent.set(r.studentId, (extraByStudent.get(r.studentId) ?? 0) + (r.quantity ?? 0));
    }

    for (const s of eligibleStudents) {
      if (!monthlyCapStudentIds.includes(s.id)) continue;
      const base = planForStudent(s)?.max_check_ins_per_month ?? 0;
      const limit = base + (extraByStudent.get(s.id) ?? 0);
      const used = usedByStudent.get(s.id) ?? 0;
      monthlyLimitByStudent.set(s.id, { used, limit, remaining: Math.max(0, limit - used) });
    }
  }

  const [{ data: users }, { data: profiles }, { data: athletes }, { data: wellnessList }] = await Promise.all([
    supabase.from("User").select("id, name, email, avatarUrl").in("id", userIds),
    supabase
      .from("StudentProfile")
      .select("studentId, weightKg, heightCm, medicalNotes, emergencyContact, phone")
      .in("studentId", eligibleIds),
    supabase.from("Athlete").select("id, studentId").in("studentId", eligibleIds),
    supabase
      .from("PreLessonWellness")
      .select("studentId, wellnessZone, sleepHours, sleepQuality, hydrationOk, stress, fatigue")
      .eq("lessonId", lessonId)
      .eq("occurrenceDate", occurrenceYmd)
      .in("studentId", eligibleIds),
  ]);

  const athleteByStudentId = new Map((athletes ?? []).map((a) => [a.studentId, a.id]));
  const athleteIds = [...athleteByStudentId.values()];

  const [{ data: evals }, { data: lastEvals }] = await Promise.all([
    athleteIds.length > 0
      ? supabase.from("AthleteEvaluation").select("athleteId").eq("lessonId", lessonId).in("athleteId", athleteIds)
      : Promise.resolve({ data: [] as { athleteId: string }[] }),
    athleteIds.length > 0 && modality
      ? supabase
          .from("AthleteEvaluation")
          .select("athleteId, scores")
          .eq("modality", modality)
          .in("athleteId", athleteIds)
          .not("scores", "is", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { athleteId: string; scores: Record<string, number> | null }[] }),
  ]);

  const evaluatedAthleteIds = new Set((evals ?? []).map((e) => e.athleteId));
  const lastScoresByAthleteId = new Map<string, Record<string, number>>();
  for (const e of lastEvals ?? []) {
    if (!lastScoresByAthleteId.has(e.athleteId) && e.scores && typeof e.scores === "object" && Object.keys(e.scores).length > 0) {
      lastScoresByAthleteId.set(e.athleteId, e.scores as Record<string, number>);
    }
  }

  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const profileByStudentId = new Map((profiles ?? []).map((p) => [p.studentId, p]));
  const wellnessByStudent = new Map<
    string,
    {
      zone: CoachLessonWellnessZone;
      sleepHours: number;
      sleepQuality: number;
      hydrationOk: boolean;
      stress: number;
      fatigue: number;
    }
  >();
  for (const row of wellnessList ?? []) {
    const w = row as {
      studentId: string;
      wellnessZone: CoachLessonWellnessZone;
      sleepHours: number;
      sleepQuality: number;
      hydrationOk: boolean;
      stress: number;
      fatigue: number;
    };
    wellnessByStudent.set(w.studentId, {
      zone: w.wellnessZone,
      sleepHours: w.sleepHours,
      sleepQuality: w.sleepQuality,
      hydrationOk: w.hydrationOk,
      stress: w.stress,
      fatigue: w.fatigue,
    });
  }

  const rows: CoachLessonStudentRow[] = eligibleStudents.map((s) => {
    const u = userById.get(s.userId);
    const prof = profileByStudentId.get(s.id);
    const att = attendanceByStudent.get(s.id);
    const plan = planForStudent(s);
    const aid = athleteByStudentId.get(s.id);
    const evaluatedInThisLesson = aid ? evaluatedAthleteIds.has(aid) : false;
    const lastScores = aid ? lastScoresByAthleteId.get(aid) : undefined;
    const lastEvalScoresByModality =
      lastScores && modality ? { [modality]: lastScores } : undefined;
    const wdata = wellnessByStudent.get(s.id);
    const preLessonWellness = wdata
      ? {
          zone: wdata.zone,
          tooltip: `Sono ${wdata.sleepHours}h · qualidade ${wdata.sleepQuality}/5 · hidratação ${wdata.hydrationOk ? "ok" : "baixa"} · stress ${wdata.stress}/5 · fadiga ${wdata.fatigue}/5`,
        }
      : null;

    return {
      studentId: s.id,
      name: u?.name ?? null,
      email: u?.email ?? "",
      planLabel: plan?.name ?? null,
      attendanceId: att?.id ?? null,
      status: att?.status ?? null,
      checkedInAt: att?.checkedInAt ?? null,
      avatarUrl: (u as { avatarUrl?: string | null } | undefined)?.avatarUrl ?? null,
      phone: prof?.phone ?? null,
      weightKg: prof?.weightKg != null ? Number(prof.weightKg) : null,
      heightCm: prof?.heightCm != null ? Number(prof.heightCm) : null,
      medicalNotes: prof?.medicalNotes ?? null,
      emergencyContact: prof?.emergencyContact ?? null,
      evaluatedInThisLesson,
      lastEvalScoresByModality,
      preLessonWellness,
      rpe: att?.rpe != null ? Number(att.rpe) : null,
      rpeRecordedAt: att?.rpeRecordedAt ?? null,
      monthlyLimit: monthlyLimitByStudent.get(s.id) ?? null,
    };
  });

  rows.sort(compareRosterRows);
  return { students: rows };
}

/** Valida elegibilidade de um aluno para check-in manual (server action). */
export async function assertStudentEligibleForCoachLesson(
  supabase: SupabaseClient,
  studentId: string,
  params: Omit<CoachLessonContext, "lessonId" | "occurrenceYmd"> & { lessonId: string }
): Promise<{ error?: string; student?: StudentRow; plan?: PlanRow }> {
  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, planId, primaryModality, status, schoolId")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return { error: "Aluno não encontrado." };
  if ((student as { schoolId?: string }).schoolId !== params.schoolId) {
    return { error: "Este aluno não pertence à escola desta aula." };
  }

  const row = student as StudentRow;
  if (row.status !== "ATIVO") return { error: "Só alunos ativos podem ser marcados presentes." };

  let plan: PlanRow | undefined;
  if (row.planId) {
    const effectivePlanId = isFamilyPlan(row.planId)
      ? (await loadFamilyReferencePlanIdByStudent(supabase, [studentId])).get(studentId)
      : row.planId;
    if (effectivePlanId) {
      const { data: planRow } = await supabase
        .from("Plan")
        .select("id, name, modalityScope, includes_check_in, isActive")
        .eq("id", effectivePlanId)
        .maybeSingle();
      plan = planRow as PlanRow | undefined;
    }
  }

  if (!isStudentEligibleForCoachLesson(row, plan, params)) {
    return { error: "Este aluno não está elegível para esta aula (plano ou modalidade)." };
  }

  return { student: row, plan };
}
