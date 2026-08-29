/**
 * Carência de acesso logo após a assinatura final da adesão (Termo + Condições Gerais):
 * o aluno tem acesso normal por 72h mesmo sem pagamento confirmado, para não bloquear
 * quem acabou de se inscrever enquanto a secretaria ainda não reconciliou o pagamento.
 * Duração fixa (não dia de calendário) — evita depender de fuso horário, ao contrário do
 * ciclo mensal de mensalidade (ver lib/payment-grace.ts, que é um conceito diferente).
 */

export const SIGNUP_GRACE_PERIOD_DAYS = 3;
export const SIGNUP_GRACE_PERIOD_MS = SIGNUP_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export function isWithinSignupGracePeriod(
  agreementSignedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!agreementSignedAt) return false;
  const signedAt = new Date(agreementSignedAt);
  if (Number.isNaN(signedAt.getTime())) return false;
  return now.getTime() < signedAt.getTime() + SIGNUP_GRACE_PERIOD_MS;
}

export type SignupGraceState = { active: true; expiresAt: string } | { active: false };

export function getSignupGraceState(
  agreementSignedAt: string | null | undefined,
  now: Date = new Date()
): SignupGraceState {
  if (!agreementSignedAt) return { active: false };
  const signedAt = new Date(agreementSignedAt);
  if (Number.isNaN(signedAt.getTime())) return { active: false };
  const expiresAt = new Date(signedAt.getTime() + SIGNUP_GRACE_PERIOD_MS);
  if (now.getTime() >= expiresAt.getTime()) return { active: false };
  return { active: true, expiresAt: expiresAt.toISOString() };
}
