"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { graduationExamActionAuth } from "@/lib/graduation/exam-auth";
import { computeExamResult, EXAM_SCORE_MAX, EXAM_SCORE_MIN, sheetEntries } from "@/lib/graduation/exam";
import { loadCandidateScoringContext, loadCandidateSheet, loadExamEventRow, toScoreInput } from "@/lib/graduation/load-exam";
import { loadModalityReadiness } from "@/lib/graduation/load-modality-readiness";
import { createInAppNotification } from "@/lib/notifications/in-app";

export type ActionResult = { error?: string; success?: boolean };

function client() {
  return getAdminClientOrNull().client;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  });
}

export async function createExamEvent(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const auth = await graduationExamActionAuth();
  if ("error" in auth) return { error: auth.error };
  const supabase = client();
  if (!supabase) return { error: "Configuração Supabase em falta." };

  const modalityCode = String(formData.get("modalityCode") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!modalityCode) return { error: "Escolhe a modalidade." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Indica a data e a hora do exame." };

  const { data: template } = await supabase.from("GraduationTemplate").select("id").eq("modalityCode", modalityCode).maybeSingle();
  if (!template) return { error: "Esta modalidade ainda não tem graduação configurada." };

  // Data/hora introduzidas em hora de Lisboa (a academia); guardadas em UTC.
  const scheduledAt = lisbonLocalToUtcIso(date, time);
  const { data: modality } = await supabase.from("ModalityRef").select("name").eq("code", modalityCode).maybeSingle();
  const { data: created, error } = await supabase
    .from("GraduationExamEvent")
    .insert({
      modalityCode,
      title: title || `Exame de graduação — ${modality?.name ?? modalityCode}`,
      scheduledAt,
      location,
      notes,
      createdByUserId: auth.userId,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("createExamEvent:", error);
    return { error: "Não foi possível criar o exame." };
  }
  revalidatePath("/coach/graduacao");
  redirect(`/coach/graduacao/${created.id}`);
}

/** Converte data/hora locais de Lisboa para ISO UTC (considera hora de verão). */
function lisbonLocalToUtcIso(date: string, time: string): string {
  const asUtc = new Date(`${date}T${time}:00Z`);
  const lisbon = new Date(asUtc.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
  const utc = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(asUtc.getTime() - (lisbon.getTime() - utc.getTime())).toISOString();
}

export async function setExamEventStatus(eventId: string, status: "COMPLETED" | "CANCELLED" | "SCHEDULED"): Promise<ActionResult> {
  const auth = await graduationExamActionAuth();
  if ("error" in auth) return { error: auth.error };
  const supabase = client();
  if (!supabase) return { error: "Configuração Supabase em falta." };

  if (status === "COMPLETED") {
    const { count } = await supabase
      .from("GraduationExamCandidate")
      .select("id", { count: "exact", head: true })
      .eq("eventId", eventId)
      .eq("status", "CONVOKED");
    if ((count ?? 0) > 0) return { error: "Ainda há alunos sem resultado. Decide (ou marca falta) antes de concluir." };
  }
  const { error } = await supabase.from("GraduationExamEvent").update({ status, updatedAt: new Date().toISOString() }).eq("id", eventId);
  if (error) return { error: "Não foi possível atualizar o exame." };
  revalidatePath("/coach/graduacao");
  revalidatePath(`/coach/graduacao/${eventId}`);
  return { success: true };
}

export async function convokeStudents(eventId: string, studentIds: string[]): Promise<ActionResult & { convoked?: number }> {
  const auth = await graduationExamActionAuth();
  if ("error" in auth) return { error: auth.error };
  const supabase = client();
  if (!supabase) return { error: "Configuração Supabase em falta." };

  const event = await loadExamEventRow(supabase, eventId);
  if (!event || event.status !== "SCHEDULED") return { error: "Este exame já não aceita convocatórias." };

  const readiness = await loadModalityReadiness(supabase, event.modalityCode);
  if (!readiness) return { error: "A modalidade não tem graduação configurada." };
  const byId = new Map(readiness.students.map((s) => [s.studentId, s]));

  const { data: existing } = await supabase.from("GraduationExamCandidate").select("studentId").eq("eventId", eventId);
  const already = new Set((existing ?? []).map((e) => e.studentId));

  const rows = [...new Set(studentIds)]
    .filter((id) => !already.has(id))
    .flatMap((id) => {
      const s = byId.get(id);
      return s?.progress.next ? [{ eventId, studentId: id, gradeId: s.progress.next.id, gradeName: s.progress.next.name }] : [];
    });
  if (rows.length === 0) return { error: "Nenhum aluno novo para convocar." };

  const { error } = await supabase.from("GraduationExamCandidate").insert(rows.map(({ gradeName: _g, ...r }) => r));
  if (error) {
    console.error("convokeStudents:", error);
    return { error: "Não foi possível convocar os alunos." };
  }

  await Promise.all(
    rows.map((r) =>
      createInAppNotification(supabase, {
        studentId: r.studentId,
        type: "GRADUATION",
        title: `Convocado para exame: ${r.gradeName}`,
        body: `${event.title} · ${formatWhen(event.scheduledAt)}${event.location ? ` · ${event.location}` : ""}. Revê os conteúdos na tua graduação.`,
        href: "/dashboard/graduacao",
      })
    )
  );

  revalidatePath(`/coach/graduacao/${eventId}`);
  return { success: true, convoked: rows.length };
}

export async function removeCandidate(candidateId: string): Promise<ActionResult> {
  const auth = await graduationExamActionAuth();
  if ("error" in auth) return { error: auth.error };
  const supabase = client();
  if (!supabase) return { error: "Configuração Supabase em falta." };

  const { data: c } = await supabase.from("GraduationExamCandidate").select("eventId, status").eq("id", candidateId).maybeSingle();
  if (!c) return { error: "Convocatória não encontrada." };
  if (c.status !== "CONVOKED") return { error: "Não é possível remover um aluno com resultado decidido." };
  const { error } = await supabase.from("GraduationExamCandidate").delete().eq("id", candidateId);
  if (error) return { error: "Não foi possível remover a convocatória." };
  revalidatePath(`/coach/graduacao/${c.eventId}`);
  return { success: true };
}

export async function setRequirementFulfilled(studentId: string, requirementId: string, fulfilled: boolean, eventId?: string): Promise<ActionResult> {
  const auth = await graduationExamActionAuth();
  if ("error" in auth) return { error: auth.error };
  const supabase = client();
  if (!supabase) return { error: "Configuração Supabase em falta." };

  const { error } = fulfilled
    ? await supabase
        .from("StudentGraduationRequirement")
        .upsert({ studentId, requirementId, fulfilledByUserId: auth.userId, fulfilledAt: new Date().toISOString() }, { onConflict: "studentId,requirementId" })
    : await supabase.from("StudentGraduationRequirement").delete().eq("studentId", studentId).eq("requirementId", requirementId);
  if (error) return { error: "Não foi possível atualizar o requisito." };
  if (eventId) revalidatePath(`/coach/graduacao/${eventId}`);
  return { success: true };
}

/** Grava em lote as notas (e comentários) do avaliador atual. Cada alteração traz o estado completo da entrada. */
export async function saveExamScores(
  candidateId: string,
  changes: { key: string; score: number | null; comment: string | null }[]
): Promise<ActionResult> {
  const auth = await graduationExamActionAuth();
  if ("error" in auth) return { error: auth.error };
  const supabase = client();
  if (!supabase) return { error: "Configuração Supabase em falta." };
  if (changes.length === 0) return { success: true };
  if (changes.length > 500) return { error: "Demasiadas alterações de uma vez." };
  for (const c of changes) {
    if (c.score != null && (!Number.isInteger(c.score) || c.score < EXAM_SCORE_MIN || c.score > EXAM_SCORE_MAX)) return { error: "Nota inválida." };
  }

  const ctx = await loadCandidateScoringContext(supabase, candidateId);
  if (!ctx) return { error: "Ficha não encontrada." };
  if (ctx.candidateStatus !== "CONVOKED" || ctx.eventStatus !== "SCHEDULED") return { error: "Este exame já foi decidido." };
  const entries = new Map(sheetEntries(ctx.sheet).map((e) => [e.key, e]));

  const now = new Date().toISOString();
  const rows = [];
  for (const c of changes) {
    const entry = entries.get(c.key);
    if (!entry) return { error: "Item não pertence a este exame." };
    rows.push({
      candidateId,
      examinerUserId: auth.userId,
      scoreKey: c.key,
      section: entry.section,
      axis: entry.axis,
      label: entry.section === "REVIEW_AXIS" ? "Revisão dos graus anteriores" : entry.label,
      isCritical: entry.isCritical,
      score: c.score,
      comment: c.comment?.trim().slice(0, 2000) || null,
      updatedAt: now,
    });
  }
  const { error } = await supabase.from("GraduationExamScore").upsert(rows, { onConflict: "candidateId,examinerUserId,scoreKey" });
  if (error) {
    console.error("saveExamScores:", error);
    return { error: "Não foi possível guardar as notas." };
  }
  return { success: true };
}

export async function decideCandidate(
  candidateId: string,
  decision: "PASSED" | "FAILED" | "ABSENT",
  feedback: string
): Promise<ActionResult> {
  const auth = await graduationExamActionAuth();
  if ("error" in auth) return { error: auth.error };
  const supabase = client();
  if (!supabase) return { error: "Configuração Supabase em falta." };

  const data = await loadCandidateSheet(supabase, candidateId, auth.userId);
  if (!data) return { error: "Ficha não encontrada." };
  if (data.candidate.status !== "CONVOKED") return { error: "Este aluno já tem resultado." };
  const result = computeExamResult(data.sheet, data.allScores.map(toScoreInput));
  if (decision === "PASSED" && !result.passed) return { error: "O aluno não cumpre o critério de aprovação." };
  if (decision === "FAILED" && result.scoredCount === 0) return { error: "Avalia o aluno antes de o reprovar (ou marca falta)." };

  const now = new Date().toISOString();
  let studentGradeId: string | null = null;
  if (decision === "PASSED") {
    const { data: grade, error: gradeErr } = await supabase
      .from("StudentGrade")
      .insert({
        studentId: data.candidate.studentId,
        modalityCode: data.event.modalityCode,
        gradeId: data.sheet.targetGrade.id,
        source: "EXAM",
        awardedAt: now,
        awardedByUserId: auth.userId,
        notes: data.event.title,
      })
      .select("id")
      .single();
    if (gradeErr || !grade) {
      console.error("decideCandidate grade:", gradeErr);
      return { error: "Não foi possível atribuir o grau." };
    }
    studentGradeId = grade.id;
  }

  const { error } = await supabase
    .from("GraduationExamCandidate")
    .update({
      status: decision,
      feedback: feedback.trim() || null,
      result: decision === "ABSENT" ? null : result,
      decidedAt: now,
      decidedByUserId: auth.userId,
      studentGradeId,
    })
    .eq("id", candidateId)
    .eq("status", "CONVOKED");
  if (error) {
    console.error("decideCandidate:", error);
    if (studentGradeId) await supabase.from("StudentGrade").delete().eq("id", studentGradeId);
    return { error: "Não foi possível gravar o resultado." };
  }

  const gradeName = data.sheet.targetGrade.name;
  if (decision !== "ABSENT") {
    await createInAppNotification(supabase, {
      studentId: data.candidate.studentId,
      type: "GRADUATION",
      title: decision === "PASSED" ? `Parabéns! Agora és ${gradeName}` : `Resultado do exame: ${gradeName}`,
      body:
        decision === "PASSED"
          ? `Foste aprovado no ${data.event.title}. Vê as tuas notas e o próximo passo da tua jornada.`
          : `Ainda não foi desta. Vê as notas e o feedback para te preparares para o próximo exame.`,
      href: `/dashboard/graduacao/exame/${candidateId}`,
    });
  }

  revalidatePath(`/coach/graduacao/${data.event.id}`);
  return { success: true };
}
