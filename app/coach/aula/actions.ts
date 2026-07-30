"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { revalidatePath } from "next/cache";
import { sendCheckInConfirmation } from "@/lib/notifications/email";
import { createPresenceConfirmedNotification, notifyStudentOfNewCoachEvaluation } from "@/lib/notifications/in-app";
import { grantBadgesIfEligible } from "@/lib/gamification";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { assertStudentEligibleForCoachLesson } from "@/lib/coach-lesson-eligible-students";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

async function onAttendanceConfirmed(supabase: SupabaseClient, attendanceId: string): Promise<void> {
  const { data: att } = await supabase
    .from("Attendance")
    .select("lessonId, studentId, occurrenceDate")
    .eq("id", attendanceId)
    .single();
  if (!att) return;

  await grantBadgesIfEligible(supabase, att.studentId);

  const { data: lesson } = await supabase
    .from("Lesson")
    .select("modality, date, startTime, endTime")
    .eq("id", att.lessonId)
    .single();
  const { data: student } = await supabase.from("Student").select("userId").eq("id", att.studentId).single();

  if (!lesson || !student) return;

  const occurrenceDate =
    (att as { occurrenceDate?: string | null }).occurrenceDate?.slice(0, 10) ??
    (lesson.date ? String(lesson.date).slice(0, 10) : new Date().toISOString().slice(0, 10));

  await createPresenceConfirmedNotification(supabase, att.studentId, {
    modality: lesson.modality,
    date: occurrenceDate,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
  });

  const { data: user } = await supabase.from("User").select("email, name").eq("id", student.userId).single();
  if (user?.email) {
    await sendCheckInConfirmation(user.email, user.name ?? null, {
      modality: lesson.modality,
      date: occurrenceDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    });
  }
}

async function assertCoachCanManageLesson(
  supabase: SupabaseClient,
  dbUser: { id: string; role: string },
  lessonId: string
): Promise<{ error?: string; schoolAssistant?: Awaited<ReturnType<typeof getActiveSchoolAssistantForUserId>> }> {
  const schoolAssistant =
    dbUser.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN" && !schoolAssistant) {
    return { error: "Sem permissão." };
  }

  if (schoolAssistant) {
    const { data: lesson } = await supabase.from("Lesson").select("schoolId").eq("id", lessonId).single();
    if (!lesson?.schoolId || lesson.schoolId !== schoolAssistant.schoolId) {
      return { error: "Esta aula não pertence à tua escola." };
    }
  }

  return { schoolAssistant: schoolAssistant ?? undefined };
}

export async function setAttendanceStatusFromForm(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const attendanceId = formData.get("attendanceId") as string | null;
  const status = formData.get("status") as string | null;
  if (!attendanceId || (status !== "CONFIRMED" && status !== "ABSENT"))
    return { error: "Dados inválidos." };
  return setAttendanceStatus(attendanceId, status);
}

export async function setAttendanceStatus(
  attendanceId: string,
  status: "CONFIRMED" | "ABSENT"
): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." };

  const supabase = await createClient();
  const schoolAssistant =
    dbUser.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN" && !schoolAssistant) return { error: "Sem permissão." };

  if (schoolAssistant) {
    const { data: att } = await supabase.from("Attendance").select("lessonId").eq("id", attendanceId).single();
    if (!att?.lessonId) return { error: "Presença não encontrada." };
    const { data: lesson } = await supabase.from("Lesson").select("schoolId").eq("id", att.lessonId).single();
    if (!lesson?.schoolId || lesson.schoolId !== schoolAssistant.schoolId) {
      return { error: "Esta aula não pertence à tua escola." };
    }
  }

  const updatePayload: { status: "CONFIRMED" | "ABSENT"; checkedInAt?: string | null } = { status };
  if (status === "CONFIRMED") {
    const { data: existing } = await supabase
      .from("Attendance")
      .select("checkedInAt")
      .eq("id", attendanceId)
      .maybeSingle();
    if (!(existing as { checkedInAt?: string | null } | null)?.checkedInAt) {
      updatePayload.checkedInAt = new Date().toISOString();
    }
  }

  const { error } = await supabase.from("Attendance").update(updatePayload).eq("id", attendanceId);

  if (error) {
    console.error("setAttendanceStatus error:", error);
    return { error: error.message };
  }

  if (status === "CONFIRMED") {
    await onAttendanceConfirmed(supabase, attendanceId);
  }

  revalidatePath("/coach/aula");
  revalidatePath("/dashboard");
  return {};
}

export async function coachCheckInStudent(
  lessonId: string,
  occurrenceDate: string,
  studentId: string
): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." };

  const occ = occurrenceDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occ)) return { error: "Data da aula inválida." };

  const supabase = await createClient();
  const access = await assertCoachCanManageLesson(supabase, dbUser, lessonId);
  if (access.error) return { error: access.error };

  const { data: lesson } = await supabase
    .from("Lesson")
    .select("id, schoolId, modality, isOpenClass")
    .eq("id", lessonId)
    .single();
  if (!lesson?.schoolId) return { error: "Aula não encontrada." };

  // Student tem RLS restrita a "própria linha" (student_select_own); o coach precisa do
  // cliente admin para verificar a elegibilidade de outro aluno (mesmo padrão da listagem
  // em app/coach/aula/page.tsx, que já usa getAdminClientOrNull para o roster).
  const adminSupabase = getAdminClientOrNull().client ?? supabase;
  const eligibility = await assertStudentEligibleForCoachLesson(adminSupabase, studentId, {
    lessonId,
    schoolId: lesson.schoolId,
    modality: lesson.modality ?? "",
    isOpenClass: Boolean((lesson as { isOpenClass?: boolean }).isOpenClass),
  });
  if (eligibility.error) return { error: eligibility.error };

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("Attendance")
    .select("id, status")
    .eq("lessonId", lessonId)
    .eq("studentId", studentId)
    .eq("occurrenceDate", occ)
    .maybeSingle();

  let attendanceId: string;

  if (existing) {
    attendanceId = (existing as { id: string }).id;
    const { error } = await supabase
      .from("Attendance")
      .update({ status: "CONFIRMED", checkedInAt: now })
      .eq("id", attendanceId);
    if (error) {
      console.error("coachCheckInStudent update error:", error);
      return { error: error.message };
    }
  } else {
    attendanceId = crypto.randomUUID();
    const { error } = await supabase.from("Attendance").insert({
      id: attendanceId,
      lessonId,
      studentId,
      status: "CONFIRMED",
      checkedInAt: now,
      isExperimental: false,
      occurrenceDate: occ,
    });
    if (error) {
      console.error("coachCheckInStudent insert error:", error);
      return { error: error.message };
    }
  }

  await onAttendanceConfirmed(supabase, attendanceId);

  revalidatePath("/coach/aula");
  revalidatePath("/coach/presenca");
  revalidatePath("/dashboard");
  return {};
}

export async function coachCheckInStudentFromForm(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const lessonId = (formData.get("lessonId") as string)?.trim();
  const studentId = (formData.get("studentId") as string)?.trim();
  const occurrenceDate = (formData.get("occurrenceDate") as string)?.trim().slice(0, 10) ?? "";
  if (!lessonId || !studentId) return { error: "Dados inválidos." };
  return coachCheckInStudent(lessonId, occurrenceDate, studentId);
}

export type SaveEvaluationFromLessonResult = { error?: string; success?: boolean };

/** Guarda avaliação feita pelo coach na aula (qualquer aluno presente). Cria Athlete se não existir. */
export async function saveEvaluationFromLesson(
  _prev: SaveEvaluationFromLessonResult | null,
  formData: FormData
): Promise<SaveEvaluationFromLessonResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." };

  const supabaseCheck = await createClient();
  const assistantUser = await getActiveSchoolAssistantForUserId(supabaseCheck, dbUser.id);
  if (assistantUser) return { error: "Treinadores assistentes não podem registar avaliações." };

  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") return { error: "Sem permissão." };

  const currentCoachId = await getCurrentCoachId();
  if (dbUser.role === "COACH" && !currentCoachId) return { error: "Perfil de coach não encontrado." };

  const lessonId = (formData.get("lessonId") as string)?.trim();
  const studentId = (formData.get("studentId") as string)?.trim();
  const modality = (formData.get("modality") as string)?.trim();
  const scoresJson = (formData.get("scoresJson") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!lessonId || !studentId || !modality) return { error: "Dados da aula ou aluno em falta." };

  let scores: Record<string, number> | null = null;
  let gas: number | null = null;
  let technique: number | null = null;
  let strength: number | null = null;
  let theory: number | null = null;

  if (scoresJson) {
    try {
      const parsed = JSON.parse(scoresJson) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        scores = {};
        for (const [k, v] of Object.entries(parsed)) {
          const n = typeof v === "number" ? v : parseInt(String(v), 10);
          if (!Number.isNaN(n) && n >= 1 && n <= 10) scores[k] = n;
        }
        if (Object.keys(scores).length === 0) return { error: "Indica pelo menos um critério (1–10)." };
      }
    } catch {
      return { error: "Scores inválidos." };
    }
  } else {
    gas = parseInt(String(formData.get("gas")), 10);
    technique = parseInt(String(formData.get("technique")), 10);
    strength = parseInt(String(formData.get("strength")), 10);
    theory = parseInt(String(formData.get("theory")), 10);
    const valid = (n: number) => !Number.isNaN(n) && n >= 1 && n <= 5;
    if (!valid(gas) || !valid(technique) || !valid(strength) || !valid(theory)) {
      return { error: "Cada dimensão deve ser entre 1 e 5." };
    }
  }

  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("Lesson")
    .select("id, coachId, modality")
    .eq("id", lessonId)
    .single();
  if (!lesson) return { error: "Aula não encontrada." };
  if (lesson.coachId !== currentCoachId && dbUser.role !== "ADMIN") return { error: "Não és o coach desta aula." };
  if (lesson.modality !== modality) return { error: "Modalidade não corresponde à aula." };

  const effectiveCoachId = currentCoachId ?? (dbUser.role === "ADMIN" ? lesson.coachId : null);
  if (!effectiveCoachId) return { error: "A aula não tem coach atribuído. Atribui um coach à aula para registar avaliações." };

  let { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle();
  if (!athlete) {
    const newId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from("Athlete").insert({
      id: newId,
      studentId,
      level: "INICIANTE",
      mainCoachId: effectiveCoachId,
    });
    if (insertErr) {
      console.error("saveEvaluationFromLesson Athlete insert:", insertErr);
      return { error: insertErr.message };
    }
    athlete = { id: newId };
  }

  const { error } = await supabase.from("AthleteEvaluation").insert({
    athleteId: athlete.id,
    coachId: effectiveCoachId,
    modality,
    lessonId,
    gas: gas ?? null,
    technique: technique ?? null,
    strength: strength ?? null,
    theory: theory ?? null,
    scores: scores ?? null,
    note,
  });

  if (error) {
    console.error("saveEvaluationFromLesson insert:", error);
    return { error: error.message };
  }

  const { processMissionAwards } = await import("@/lib/xp-missions");
  await processMissionAwards(supabase, athlete.id);

  await notifyStudentOfNewCoachEvaluation(supabase, { studentId, coachId: effectiveCoachId });

  revalidatePath("/coach/aula");
  revalidatePath("/coach/atletas");
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notificacoes");
  return { success: true };
}
