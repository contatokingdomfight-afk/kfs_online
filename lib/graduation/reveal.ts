import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createInAppNotification } from "@/lib/notifications/in-app";

/**
 * Revelação dos resultados: a decisão do exame fica guardada (status + pendingGrades) e só é aplicada
 * na data de revelação do dia de exame — graus atribuídos, XP (a vista só conta exames revelados),
 * notificação e página do resultado. Sem tarefa agendada: corre quando alguém abre páginas que
 * dependem disto (graduação do aluno, painel, páginas do coach) e no cron diário.
 */

export type PendingGrade = { gradeId: string; source: "EXAM" | "SKIPPED" | "PLACEMENT"; notes: string };

const DECIDED = ["PASSED", "FAILED", "ABSENT"];

/** A data de revelação já passou. */
export function isRevealDue(resultsRevealAt: string | null | undefined, now: Date = new Date()): boolean {
  return !!resultsRevealAt && new Date(resultsRevealAt).getTime() <= now.getTime();
}

/**
 * Aplica um resultado decidido (uma só vez: a linha é reclamada pondo revealedAt).
 * Devolve true se foi este pedido a revelá-lo.
 */
export async function revealCandidate(supabase: SupabaseClient, candidateId: string, now: Date = new Date()): Promise<boolean> {
  const at = now.toISOString();
  const { data: claimed } = await supabase
    .from("GraduationExamCandidate")
    .update({ revealedAt: at })
    .eq("id", candidateId)
    .is("revealedAt", null)
    .in("status", DECIDED)
    .select("id, eventId, studentId, status, gradeId, mode, placementAwardedGradeId, pendingGrades, decidedByUserId")
    .maybeSingle();
  if (!claimed) return false;

  const { data: event } = await supabase.from("GraduationExamEvent").select("title, modalityCode").eq("id", claimed.eventId).maybeSingle();
  if (!event) return true;

  const pending = ((claimed.pendingGrades as PendingGrade[] | null) ?? []).filter((g) => g?.gradeId);
  let studentGradeId: string | null = null;
  if (pending.length > 0) {
    // O último é o grau final; os anteriores ficam um pouco antes para o final ser o mais recente.
    const base = now.getTime();
    const rows = pending.map((g, i) => ({
      studentId: claimed.studentId,
      modalityCode: event.modalityCode,
      gradeId: g.gradeId,
      source: g.source,
      awardedAt: new Date(base - (pending.length - 1 - i) * 1000).toISOString(),
      awardedByUserId: (claimed.decidedByUserId as string | null) ?? null,
      notes: g.notes,
    }));
    const { data: inserted, error } = await supabase.from("StudentGrade").insert(rows).select("id, gradeId");
    if (error || !inserted) {
      console.error("revealCandidate grades:", error);
      // Volta a ficar por revelar para tentar de novo no próximo acesso.
      await supabase.from("GraduationExamCandidate").update({ revealedAt: null }).eq("id", candidateId);
      return false;
    }
    const finalId = pending[pending.length - 1].gradeId;
    studentGradeId = (inserted.find((r) => r.gradeId === finalId)?.id as string | undefined) ?? null;
  }
  await supabase.from("GraduationExamCandidate").update({ studentGradeId, pendingGrades: null }).eq("id", candidateId);

  if (claimed.status !== "ABSENT") {
    const isPlacement = claimed.mode === "PLACEMENT";
    const gradeId = (claimed.placementAwardedGradeId as string | null) ?? (claimed.gradeId as string);
    const { data: grade } = await supabase.from("GraduationGrade").select("name").eq("id", gradeId).maybeSingle();
    const gradeName = (grade?.name as string | undefined) ?? "Grau";
    const passed = claimed.status === "PASSED";
    await createInAppNotification(supabase, {
      studentId: claimed.studentId,
      type: "GRADUATION",
      title: isPlacement
        ? passed
          ? `Nivelamento: começas em ${gradeName}`
          : "Resultado do nivelamento"
        : passed
          ? `Parabéns! Agora és ${gradeName}`
          : `Resultado do exame: ${gradeName}`,
      body: isPlacement
        ? "O resultado do teu nivelamento já está disponível. Vê as notas e o teu próximo objetivo."
        : passed
          ? `Foste aprovado no ${event.title}. Vê as tuas notas e o próximo passo da tua jornada.`
          : "Ainda não foi desta. Vê as notas e o feedback para te preparares para o próximo exame.",
      href: `/dashboard/graduacao/exame/${candidateId}`,
    });
  }
  return true;
}

/** Revela os resultados cuja data já chegou (opcionalmente só de um aluno ou de um dia de exame). */
export async function revealDueResults(
  supabase: SupabaseClient,
  filter: { studentId?: string; eventId?: string } = {},
  now: Date = new Date()
): Promise<number> {
  let query = supabase.from("GraduationExamCandidate").select("id, eventId").is("revealedAt", null).in("status", DECIDED).limit(500);
  if (filter.studentId) query = query.eq("studentId", filter.studentId);
  if (filter.eventId) query = query.eq("eventId", filter.eventId);
  const { data: pending } = await query;
  if (!pending || pending.length === 0) return 0;

  const eventIds = [...new Set(pending.map((c) => c.eventId as string))];
  const { data: events } = await supabase
    .from("GraduationExamEvent")
    .select("id")
    .in("id", eventIds)
    .lte("resultsRevealAt", now.toISOString());
  const due = new Set((events ?? []).map((e) => e.id as string));
  let revealed = 0;
  for (const c of pending) {
    if (due.has(c.eventId as string) && (await revealCandidate(supabase, c.id as string, now))) revealed++;
  }
  return revealed;
}
