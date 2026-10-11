/**
 * Regras puras do «A tratar hoje» (admin): quem entra em cada alerta e a chave com que um item
 * fica «Feito». Datas em YYYY-MM-DD (dia de Lisboa).
 */

export type AdminTodoKind = "pagamentos" | "risco" | "carga" | "adesao" | "fisicas" | "experimentais";

export const ADMIN_TODO_ORDER: AdminTodoKind[] = ["pagamentos", "risco", "carga", "adesao", "fisicas", "experimentais"];

/** Dias sem treinar a partir dos quais o aluno conta como «em risco de sair». */
export const RISK_DAYS = 14;
/** Avaliações físicas que vencem até este nº de dias (ou já venceram) entram no alerta. */
export const PHYSICAL_DUE_WITHIN_DAYS = 30;
/** Experimentais feitas há no máximo este nº de dias e ainda não convertidas. */
export const TRIAL_WINDOW_DAYS = 14;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** Segunda-feira da semana (chave para lembretes que voltam a aparecer na semana seguinte). */
export function weekKey(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7;
  return addDaysYmd(ymd, -dow);
}

/**
 * Risco de sair: aluno ativo com plano que não treina há RISK_DAYS ou mais.
 * Sem nenhum treino: conta se a conta tiver mais de RISK_DAYS (nunca veio).
 * Devolve null quando não está em risco.
 */
export function churnRisk(params: { today: string; lastTraining: string | null; createdAt: string }): { daysSince: number; neverTrained: boolean } | null {
  const { today, lastTraining, createdAt } = params;
  if (lastTraining) {
    const days = daysBetween(lastTraining, today);
    return days >= RISK_DAYS ? { daysSince: days, neverTrained: false } : null;
  }
  const age = daysBetween(createdAt.slice(0, 10), today);
  return age >= RISK_DAYS ? { daysSince: age, neverTrained: true } : null;
}

/** Avaliação física a renovar: vence dentro de PHYSICAL_DUE_WITHIN_DAYS dias ou já venceu. */
export function physicalDue(today: string, nextDueAt: string | null): { daysLeft: number } | null {
  if (!nextDueAt) return null;
  const daysLeft = daysBetween(today, nextDueAt.slice(0, 10));
  return daysLeft <= PHYSICAL_DUE_WITHIN_DAYS ? { daysLeft } : null;
}

/** Experimental por converter: aula já feita há no máximo TRIAL_WINDOW_DAYS dias e não convertida. */
export function trialToConvert(today: string, lessonDate: string | null, converted: boolean): { daysAgo: number } | null {
  if (converted || !lessonDate) return null;
  const daysAgo = daysBetween(lessonDate.slice(0, 10), today);
  return daysAgo >= 0 && daysAgo <= TRIAL_WINDOW_DAYS ? { daysAgo } : null;
}

/**
 * Chave «Feito»: identifica a ocorrência tratada. Quando a situação muda (outro mês em atraso,
 * outra data de último treino, nova semana para lembretes), a chave muda e o item volta.
 */
export function todoDoneKey(kind: AdminTodoKind, parts: { id: string; ref?: string | null; today: string }): string {
  switch (kind) {
    case "pagamentos":
    case "adesao":
      return `${parts.id}:${parts.ref ?? ""}:${weekKey(parts.today)}`;
    case "carga":
      return `${parts.id}:${weekKey(parts.today)}`;
    default:
      return `${parts.id}:${parts.ref ?? ""}`;
  }
}
