/**
 * Lógica pura de idade do Fighter Card — sem dependências (nem "server-only"),
 * para poder ser testada sem carregar `lib/fighter-card.ts` (que puxa `lib/get-rank-info.ts`,
 * marcado "server-only"). Ver DOCS/FIGHTER_CARD_MVP.md §5.
 */

/** Idade máxima (inclusive) considerada "Kids" — mesmo critério do filtro de faixa etária do rank. */
export const FIGHTER_CARD_KIDS_MAX_AGE = 12;

/** Idade em anos completos numa data (por omissão, hoje). `null` se a data for inválida/vazia. */
export function calculateAge(dateOfBirth: string | null | undefined, today: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Elegível para o Fighter Card por idade? Por omissão (data de nascimento por preencher)
 * devolve `false` — mais seguro do que assumir adulto quando não sabemos, dado tratar-se de
 * uma funcionalidade pública/partilhável. O aluno só precisa de preencher a data uma vez.
 */
export function isFighterCardEligibleAge(dateOfBirth: string | null | undefined): boolean {
  const age = calculateAge(dateOfBirth);
  if (age === null) return false;
  return age > FIGHTER_CARD_KIDS_MAX_AGE;
}
