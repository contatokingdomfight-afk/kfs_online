/**
 * Regras puras do «A tratar hoje» (admin): quem entra em cada alerta e a chave com que um item
 * fica «Feito». Datas em YYYY-MM-DD (dia de Lisboa).
 */

export type AdminTodoKind =
  | "pagamentos"
  | "seguros"
  | "encomendas"
  | "vencer"
  | "semana"
  | "risco"
  | "inativos"
  | "semplano"
  | "carga"
  | "adesao"
  | "fisicas"
  | "performance"
  | "exame"
  | "confirmar"
  | "experimentais"
  | "aniversarios";

export const ADMIN_TODO_ORDER: AdminTodoKind[] = ["pagamentos", "seguros", "encomendas", "vencer", "semana", "risco", "inativos", "semplano", "carga", "adesao", "fisicas", "performance", "exame", "confirmar", "experimentais", "aniversarios"];

/** Prazo da mensalidade: dia 8 do mês de referência (ver lib/lisbon-payment-dates.ts). */
export const TUITION_DUE_DAY = 8;
/** «A vencer»: mensalidades do mês por pagar nos últimos N dias antes do prazo. */
export const DUE_SOON_DAYS = 3;
/** «Registados sem plano»: contas criadas há pelo menos 1 dia e no máximo N dias. */
export const NO_PLAN_WINDOW_DAYS = 60;

/** Dias sem treinar a partir dos quais o aluno conta como «em risco de sair». */
export const RISK_DAYS = 7;
/**
 * «Alunos inativados»: quem passou a INATIVO há no máximo N dias. Tem de ficar abaixo dos 120 dias
 * de histórico de loadDoneKeys, senão um item «Feito» voltava à lista.
 */
export const INACTIVE_FAREWELL_DAYS = 90;
/** Avaliações físicas que vencem até este nº de dias (ou já venceram) entram no alerta. */
export const PHYSICAL_DUE_WITHIN_DAYS = 30;
/** Performance (AthleteEvaluation): alunos a treinar sem avaliação há este nº de dias ou mais. */
export const PERFORMANCE_STALE_DAYS = 30;
/** Experimentais feitas há no máximo este nº de dias e ainda não convertidas. */
export const TRIAL_WINDOW_DAYS = 14;
/** Experimentais por confirmar: aulas de hoje até daqui a N dias. */
export const TRIAL_CONFIRM_DAYS = 2;

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

/** Despedida de inativado: mudou de estado há no máximo INACTIVE_FAREWELL_DAYS. Sem data (inativos antigos) não entra. */
export function inactiveFarewell(today: string, statusChangedAt: string | null): { days: number } | null {
  if (!statusChangedAt) return null;
  const days = daysBetween(statusChangedAt.slice(0, 10), today);
  return days >= 0 && days <= INACTIVE_FAREWELL_DAYS ? { days } : null;
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

/** Data-limite (YYYY-MM-DD) da mensalidade de um mês de referência (YYYY-MM). */
export function tuitionDueDate(referenceMonth: string): string {
  return `${referenceMonth.slice(0, 7)}-${String(TUITION_DUE_DAY).padStart(2, "0")}`;
}

/** Em atraso só depois do prazo (antes do dia 8 a mensalidade do mês ainda não venceu). */
export function isTuitionOverdue(today: string, referenceMonth: string): boolean {
  return today > tuitionDueDate(referenceMonth);
}

/** A vencer: ainda dentro do prazo e a no máximo DUE_SOON_DAYS dias dele. */
export function tuitionDueSoon(today: string, referenceMonth: string): { daysLeft: number } | null {
  const daysLeft = daysBetween(today, tuitionDueDate(referenceMonth));
  return daysLeft >= 0 && daysLeft <= DUE_SOON_DAYS ? { daysLeft } : null;
}

/** Aniversário hoje (0) ou amanhã (1); devolve também a idade que faz. */
export function birthdaySoon(today: string, dateOfBirth: string | null): { inDays: 0 | 1; age: number } | null {
  if (!dateOfBirth) return null;
  const dob = dateOfBirth.slice(0, 10);
  for (const inDays of [0, 1] as const) {
    const day = addDaysYmd(today, inDays);
    if (day.slice(5) === dob.slice(5)) return { inDays, age: Number(day.slice(0, 4)) - Number(dob.slice(0, 4)) };
  }
  return null;
}

/** Registado sem plano há pelo menos 1 dia e no máximo NO_PLAN_WINDOW_DAYS. */
export function noPlanLead(today: string, createdAt: string): { days: number } | null {
  const days = daysBetween(createdAt.slice(0, 10), today);
  return days >= 1 && days <= NO_PLAN_WINDOW_DAYS ? { days } : null;
}

/**
 * Chave «Feito»: identifica a ocorrência tratada. Quando a situação muda (outro mês em atraso,
 * outra data de último treino, nova semana para lembretes), a chave muda e o item volta.
 */
export function todoDoneKey(kind: AdminTodoKind, parts: { id: string; ref?: string | null; today: string }): string {
  switch (kind) {
    case "pagamentos":
    case "seguros":
    case "encomendas":
    case "adesao":
      return `${parts.id}:${parts.ref ?? ""}:${weekKey(parts.today)}`;
    case "aniversarios":
      return `${parts.id}:${parts.today.slice(0, 4)}`;
    case "carga":
    case "performance":
      return `${parts.id}:${weekKey(parts.today)}`;
    default:
      return `${parts.id}:${parts.ref ?? ""}`;
  }
}
