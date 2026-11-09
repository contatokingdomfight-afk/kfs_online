/**
 * Pausas de mensalidade (ex.: atestado médico) — tabela StudentTuitionPause.
 *
 * Regras (decididas com a direção, 2026-11-09):
 * - Mês de início: pausa começa até ao dia de pagamento → esse mês não é cobrado; depois → é cobrado.
 * - Mês de regresso: regressa até ao dia 15 → esse mês é cobrado; depois do dia 15 → só o seguinte.
 * - Meses no meio: não são cobrados. Pausa sem data de regresso: não cobra até ser retomada.
 * - Acesso à app mantém-se; fidelização é adiada pelos meses não cobrados.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Regressos depois deste dia do mês só pagam a partir do mês seguinte. */
export const PAUSE_RETURN_CUTOFF_DAY = 15;

export type TuitionPause = {
  id: string;
  studentId: string;
  startDate: string; // YYYY-MM-DD
  expectedEndDate: string | null;
  endDate: string | null;
  reason: "MEDICAL" | "OTHER";
  notes: string | null;
  attachmentPath: string | null;
  attachmentFileName: string | null;
  loyaltyMonthsShifted: number;
  createdAt: string;
};

export const PAUSE_COLUMNS =
  "id, studentId, startDate, expectedEndDate, endDate, reason, notes, attachmentPath, attachmentFileName, loyaltyMonthsShifted, createdAt";

function day(ymd: string): number {
  return Number(ymd.slice(8, 10));
}

/** Pausa em curso nessa data (já começou e ainda não terminou). */
export function isPauseActiveOn(p: Pick<TuitionPause, "startDate" | "endDate">, today: string): boolean {
  return p.startDate <= today && (!p.endDate || p.endDate > today);
}

/** A pausa isenta a mensalidade desse mês (YYYY-MM)? */
export function pauseExemptsMonth(
  p: Pick<TuitionPause, "startDate" | "endDate">,
  month: string,
  dueDay: number
): boolean {
  const startMonth = p.startDate.slice(0, 7);
  if (month < startMonth) return false;
  if (month === startMonth && day(p.startDate) > dueDay) return false;
  if (!p.endDate) return true;
  const endMonth = p.endDate.slice(0, 7);
  if (month > endMonth) return false;
  if (month === endMonth) return day(p.endDate) > PAUSE_RETURN_CUTOFF_DAY;
  return true;
}

/** Alguma das pausas isenta esse mês? */
export function monthExemptByPauses(
  pauses: Pick<TuitionPause, "startDate" | "endDate">[],
  month: string,
  dueDay: number
): boolean {
  return pauses.some((p) => pauseExemptsMonth(p, month, dueDay));
}

/** Meses (YYYY-MM) entre dois meses, inclusive. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Nº de meses não cobrados por uma pausa já terminada (para adiar a fidelização). */
export function exemptMonthCount(p: Pick<TuitionPause, "startDate" | "endDate">, dueDay: number): number {
  if (!p.endDate) return 0;
  return monthsBetween(p.startDate.slice(0, 7), p.endDate.slice(0, 7)).filter((m) => pauseExemptsMonth(p, m, dueDay)).length;
}

/** Primeiro mês cobrado depois de uma pausa terminada. */
export function firstChargedMonthAfter(p: Pick<TuitionPause, "startDate" | "endDate">, dueDay: number): string | null {
  if (!p.endDate) return null;
  const endMonth = p.endDate.slice(0, 7);
  if (!pauseExemptsMonth(p, endMonth, dueDay)) return endMonth;
  const [y, m] = endMonth.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Pausas (todas, por aluno). Tolerante à tabela ainda não existir. */
export async function loadPausesByStudent(
  supabase: SupabaseClient,
  studentIds?: string[]
): Promise<Map<string, TuitionPause[]>> {
  const out = new Map<string, TuitionPause[]>();
  if (studentIds && studentIds.length === 0) return out;
  const parts: (string[] | undefined)[] = [];
  if (studentIds) for (let i = 0; i < studentIds.length; i += 200) parts.push(studentIds.slice(i, i + 200));
  else parts.push(undefined);
  for (const part of parts) {
    let q = supabase.from("StudentTuitionPause").select(PAUSE_COLUMNS).order("startDate", { ascending: true });
    if (part) q = q.in("studentId", part);
    const { data, error } = await q;
    if (error) return out; // migração por aplicar
    for (const r of (data ?? []) as TuitionPause[]) {
      const list = out.get(r.studentId) ?? [];
      list.push(r);
      out.set(r.studentId, list);
    }
  }
  return out;
}

/** Pausa em curso de um aluno (ou null). */
export async function loadOpenPause(supabase: SupabaseClient, studentId: string): Promise<TuitionPause | null> {
  const { data, error } = await supabase
    .from("StudentTuitionPause")
    .select(PAUSE_COLUMNS)
    .eq("studentId", studentId)
    .is("endDate", null)
    .maybeSingle();
  if (error) return null;
  return (data as TuitionPause | null) ?? null;
}
