import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildExamSheet, computeExamResult, type ExamResult, type ExamScoreInput, type ExamSheet } from "./exam";
import { loadGraduationTemplate } from "./load-template";
import { computePlacementResult, placementLevelSheets, placementMaxIndex, placementSheet, type PlacementResult } from "./placement";
import type { GraduationTemplateDraft } from "./template";

/** Colunas do candidato que definem a ficha (exame normal ou nivelamento). */
const CANDIDATE_SHEET_COLUMNS = "gradeId, mode, placementStartGradeId, placementMaxGradeId";

type CandidateSheetRef = { gradeId: string; mode?: string | null; placementStartGradeId?: string | null };

/** Índices (no template) do primeiro e do último grau avaliados num nivelamento; null se não for nivelamento. */
function placementRange(template: GraduationTemplateDraft, c: CandidateSheetRef): { start: number; frontier: number } | null {
  if (c.mode !== "PLACEMENT" || !c.placementStartGradeId) return null;
  const ids = template.grades.map((g) => g.id);
  const start = ids.indexOf(c.placementStartGradeId);
  const frontier = ids.indexOf(c.gradeId);
  return start >= 0 && frontier >= start ? { start, frontier } : null;
}

/** Ficha do candidato: a do grau-alvo, ou (nivelamento) todos os itens dos graus avaliados. */
export function sheetForCandidate(template: GraduationTemplateDraft, c: CandidateSheetRef): ExamSheet | null {
  if (c.mode === "PLACEMENT") {
    const range = placementRange(template, c);
    return range ? placementSheet(template.grades, range.start, range.frontier) : null;
  }
  return sheetForGrade(template, c.gradeId);
}

export type CandidatePlacement = {
  startIndex: number;
  frontierIndex: number;
  maxIndex: number;
  note: string | null;
  decisionNote: string | null;
  awardedGradeId: string | null;
  /** Ficha de cada grau avaliado (do primeiro ao atual). */
  levelSheets: ExamSheet[];
  result: PlacementResult;
  grades: { id: string; name: string; colors: string[] }[];
};
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
  /** Agenda com horários (null = exame sem horários). */
  endsAt: string | null;
  slotMinutes: number | null;
  slotCapacity: number | null;
  selfBooking: boolean;
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
  slotStartsAt: string | null;
  bookedByStudent: boolean;
  /** Preenchido = salto de grau decidido pelo admin. */
  skipReason: string | null;
  /** Nivelamento: gradeId é o último grau avaliado; awardedGradeName o grau atribuído (após a decisão). */
  mode: "GRADE" | "PLACEMENT";
  awardedGradeName: string | null;
  placementMaxGradeId: string | null;
  placementNote: string | null;
};

type ScoreRow = ExamScoreRowView & { candidateId: string };

export async function loadExamEventRow(supabase: SupabaseClient, eventId: string): Promise<ExamEventRow | null> {
  const { data: event } = await supabase
    .from("GraduationExamEvent")
    .select("id, modalityCode, title, scheduledAt, location, notes, status, endsAt, slotMinutes, slotCapacity, selfBooking")
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
      .select("id, studentId, gradeId, status, feedback, decidedAt, result, slotStartsAt, bookedByStudent, skipReason, mode, placementStartGradeId, placementAwardedGradeId, placementMaxGradeId, placementNote")
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
      const sheet = sheetForCandidate(template, c);
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
      slotStartsAt: (c.slotStartsAt as string | null) ?? null,
      bookedByStudent: Boolean(c.bookedByStudent),
      skipReason: (c.skipReason as string | null) ?? null,
      mode: c.mode === "PLACEMENT" ? "PLACEMENT" : "GRADE",
      awardedGradeName: c.placementAwardedGradeId ? gradeById.get(c.placementAwardedGradeId)?.name ?? null : null,
      placementMaxGradeId: (c.placementMaxGradeId as string | null) ?? null,
      placementNote: (c.placementNote as string | null) ?? null,
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
  /** Preenchido num exame de nivelamento. */
  placement: CandidatePlacement | null;
};

export async function loadCandidateSheet(
  supabase: SupabaseClient,
  candidateId: string,
  examinerUserId: string
): Promise<CandidateSheetData | null> {
  const { data: candidate } = await supabase
    .from("GraduationExamCandidate")
    .select(`id, eventId, studentId, status, feedback, decidedAt, result, placementNote, placementDecisionNote, placementAwardedGradeId, ${CANDIDATE_SHEET_COLUMNS}`)
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return null;
  const event = await loadExamEventRow(supabase, candidate.eventId);
  if (!event) return null;
  const template = await loadGraduationTemplate(supabase, event.modalityCode);
  const sheet = template ? sheetForCandidate(template, candidate) : null;
  if (!sheet || !template) return null;

  const [{ data: scoreRows }, names] = await Promise.all([
    supabase.from("GraduationExamScore").select(SCORE_COLUMNS).eq("candidateId", candidateId),
    loadStudentNames(supabase, [candidate.studentId]),
  ]);
  const allScores = (scoreRows ?? []) as ScoreRow[];
  const examinerIds = [...new Set(allScores.map((s) => s.examinerUserId))];
  const { data: examiners } = examinerIds.length ? await supabase.from("User").select("id, name").in("id", examinerIds) : { data: [] };

  const myScores: CandidateSheetData["myScores"] = {};
  for (const s of allScores) if (s.examinerUserId === examinerUserId) myScores[s.scoreKey] = { score: s.score, comment: s.comment };

  const range = placementRange(template, candidate);
  const placement: CandidatePlacement | null = range
    ? {
        startIndex: range.start,
        frontierIndex: range.frontier,
        maxIndex: placementMaxIndex(template.grades, (candidate.placementMaxGradeId as string | null) ?? null),
        note: (candidate.placementNote as string | null) ?? null,
        decisionNote: (candidate.placementDecisionNote as string | null) ?? null,
        awardedGradeId: (candidate.placementAwardedGradeId as string | null) ?? null,
        levelSheets: placementLevelSheets(template.grades, range.start, range.frontier),
        result: computePlacementResult(template.grades, range.start, range.frontier, allScores.map(toScoreInput)),
        grades: template.grades.map((g) => ({ id: g.id, name: g.name, colors: g.colors })),
      }
    : null;

  return {
    placement,
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
    .select(`eventId, status, ${CANDIDATE_SHEET_COLUMNS}`)
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return null;
  const { data: event } = await supabase.from("GraduationExamEvent").select("modalityCode, status").eq("id", candidate.eventId).maybeSingle();
  if (!event) return null;
  const template = await loadGraduationTemplate(supabase, event.modalityCode);
  const sheet = template ? sheetForCandidate(template, candidate) : null;
  if (!sheet) return null;
  return { candidateStatus: candidate.status as ExamCandidateStatus, eventStatus: event.status as ExamEventRow["status"], sheet };
}
