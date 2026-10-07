import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildExamSheet, computeExamResult, type ExamResult, type ExamScoreInput, type ExamSheet } from "./exam";
import { loadGraduationTemplate } from "./load-template";
import type { GraduationTemplateDraft } from "./template";
import type { ExamScoreRowView } from "@/components/graduation/ExamResultBreakdown";

const SCORE_COLUMNS = "candidateId, examinerUserId, scoreKey, score, comment, section, axis, label, isCritical";

export type ExamEventRow = {
  id: string;
  modalityCode: string;
  modalityName: string;
  title: string;
  scheduledAt: string;
  location: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};

export type ExamCandidateStatus = "CONVOKED" | "PASSED" | "FAILED" | "ABSENT";

export type ExamCandidateRow = {
  id: string;
  studentId: string;
  studentName: string;
  gradeId: string;
  gradeName: string;
  gradeColors: string[];
  status: ExamCandidateStatus;
  feedback: string | null;
  decidedAt: string | null;
  result: ExamResult | null;
  /** Notas dadas pelo avaliador atual. */
  myScoredCount: number;
};

type ScoreRow = ExamScoreRowView & { candidateId: string };

export async function loadExamEventRow(supabase: SupabaseClient, eventId: string): Promise<ExamEventRow | null> {
  const { data: event } = await supabase
    .from("GraduationExamEvent")
    .select("id, modalityCode, title, scheduledAt, location, notes, status")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return null;
  const { data: modality } = await supabase.from("ModalityRef").select("name").eq("code", event.modalityCode).maybeSingle();
  return { ...(event as Omit<ExamEventRow, "modalityName">), modalityName: modality?.name ?? event.modalityCode };
}

/** Ficha de exame de um candidato (grau alvo no template atual). */
export function sheetForGrade(template: GraduationTemplateDraft, gradeId: string): ExamSheet | null {
  const index = template.grades.findIndex((g) => g.id === gradeId);
  return index >= 0 ? buildExamSheet(template.grades, index) : null;
}

export async function loadStudentNames(supabase: SupabaseClient, studentIds: string[]): Promise<Map<string, string>> {
  if (studentIds.length === 0) return new Map();
  const { data: students } = await supabase.from("Student").select("id, userId").in("id", studentIds);
  const userIds = (students ?? []).map((s) => s.userId);
  const { data: users } = userIds.length ? await supabase.from("User").select("id, name").in("id", userIds) : { data: [] };
  const userName = new Map((users ?? []).map((u) => [u.id, u.name ?? ""]));
  return new Map((students ?? []).map((s) => [s.id, userName.get(s.userId) || "Sem nome"]));
}

export async function loadExamEventDetail(
  supabase: SupabaseClient,
  eventId: string,
  examinerUserId: string
): Promise<{ event: ExamEventRow; template: GraduationTemplateDraft | null; candidates: ExamCandidateRow[] } | null> {
  const event = await loadExamEventRow(supabase, eventId);
  if (!event) return null;

  const [template, { data: candidateRows }] = await Promise.all([
    loadGraduationTemplate(supabase, event.modalityCode),
    supabase
      .from("GraduationExamCandidate")
      .select("id, studentId, gradeId, status, feedback, decidedAt, result")
      .eq("eventId", eventId)
      .order("createdAt", { ascending: true }),
  ]);
  const rows = candidateRows ?? [];
  const candidateIds = rows.map((c) => c.id);
  const [names, { data: scoreRows }] = await Promise.all([
    loadStudentNames(
      supabase,
      rows.map((c) => c.studentId)
    ),
    candidateIds.length
      ? supabase.from("GraduationExamScore").select(SCORE_COLUMNS).in("candidateId", candidateIds)
      : Promise.resolve({ data: [] as ScoreRow[] }),
  ]);
  const scores = (scoreRows ?? []) as ScoreRow[];
  const gradeById = new Map((template?.grades ?? []).map((g) => [g.id, g]));

  const candidates: ExamCandidateRow[] = rows.map((c) => {
    const grade = gradeById.get(c.gradeId);
    const mine = scores.filter((s) => s.candidateId === c.id);
    let result = (c.result as ExamResult | null) ?? null;
    if (c.status === "CONVOKED" && template) {
      const sheet = sheetForGrade(template, c.gradeId);
      result = sheet ? computeExamResult(sheet, mine.map(toScoreInput)) : null;
    }
    return {
      id: c.id,
      studentId: c.studentId,
      studentName: names.get(c.studentId) ?? "Sem nome",
      gradeId: c.gradeId,
      gradeName: grade?.name ?? "Grau",
      gradeColors: grade?.colors ?? [],
      status: c.status as ExamCandidateStatus,
      feedback: c.feedback,
      decidedAt: c.decidedAt,
      result,
      myScoredCount: mine.filter((s) => s.examinerUserId === examinerUserId && s.score != null).length,
    };
  });

  candidates.sort((a, b) => a.studentName.localeCompare(b.studentName, "pt"));
  return { event, template, candidates };
}

export function toScoreInput(s: { scoreKey: string; score: number | null; examinerUserId: string }): ExamScoreInput {
  return { key: s.scoreKey, score: s.score, examinerUserId: s.examinerUserId };
}

export type CandidateSheetData = {
  event: ExamEventRow;
  candidate: {
    id: string;
    studentId: string;
    studentName: string;
    status: ExamCandidateStatus;
    feedback: string | null;
    decidedAt: string | null;
    /** Resultado gravado na decisão (null enquanto convocado ou se faltou). */
    storedResult: ExamResult | null;
  };
  sheet: ExamSheet;
  /** Notas do avaliador atual por chave. */
  myScores: Record<string, { score: number | null; comment: string | null }>;
  /** Média de todos os avaliadores por chave e comentários (para o resultado). */
  allScores: ScoreRow[];
  result: ExamResult;
  examinerNames: Map<string, string>;
};

export async function loadCandidateSheet(
  supabase: SupabaseClient,
  candidateId: string,
  examinerUserId: string
): Promise<CandidateSheetData | null> {
  const { data: candidate } = await supabase
    .from("GraduationExamCandidate")
    .select("id, eventId, studentId, gradeId, status, feedback, decidedAt, result")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return null;
  const event = await loadExamEventRow(supabase, candidate.eventId);
  if (!event) return null;
  const template = await loadGraduationTemplate(supabase, event.modalityCode);
  const sheet = template ? sheetForGrade(template, candidate.gradeId) : null;
  if (!sheet) return null;

  const [{ data: scoreRows }, names] = await Promise.all([
    supabase.from("GraduationExamScore").select(SCORE_COLUMNS).eq("candidateId", candidateId),
    loadStudentNames(supabase, [candidate.studentId]),
  ]);
  const allScores = (scoreRows ?? []) as ScoreRow[];
  const examinerIds = [...new Set(allScores.map((s) => s.examinerUserId))];
  const { data: examiners } = examinerIds.length ? await supabase.from("User").select("id, name").in("id", examinerIds) : { data: [] };

  const myScores: CandidateSheetData["myScores"] = {};
  for (const s of allScores) if (s.examinerUserId === examinerUserId) myScores[s.scoreKey] = { score: s.score, comment: s.comment };

  return {
    event,
    candidate: {
      id: candidate.id,
      studentId: candidate.studentId,
      studentName: names.get(candidate.studentId) ?? "Sem nome",
      status: candidate.status as ExamCandidateStatus,
      feedback: candidate.feedback,
      decidedAt: candidate.decidedAt,
      storedResult: (candidate.result as ExamResult | null) ?? null,
    },
    sheet,
    myScores,
    allScores,
    result: computeExamResult(sheet, allScores.map(toScoreInput)),
    examinerNames: new Map((examiners ?? []).map((u) => [u.id, u.name ?? "Avaliador"])),
  };
}

/** Contexto mínimo para validar notas (sem nomes nem notas existentes): estado e ficha do candidato. */
export async function loadCandidateScoringContext(
  supabase: SupabaseClient,
  candidateId: string
): Promise<{ candidateStatus: ExamCandidateStatus; eventStatus: ExamEventRow["status"]; sheet: ExamSheet } | null> {
  const { data: candidate } = await supabase
    .from("GraduationExamCandidate")
    .select("eventId, gradeId, status")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return null;
  const { data: event } = await supabase.from("GraduationExamEvent").select("modalityCode, status").eq("id", candidate.eventId).maybeSingle();
  if (!event) return null;
  const template = await loadGraduationTemplate(supabase, event.modalityCode);
  const sheet = template ? sheetForGrade(template, candidate.gradeId) : null;
  if (!sheet) return null;
  return { candidateStatus: candidate.status as ExamCandidateStatus, eventStatus: event.status as ExamEventRow["status"], sheet };
}
