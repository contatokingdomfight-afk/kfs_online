/**
 * Deteta nomes de registo gerados por bots (ex.: «cMwoPrHwfRwfpoMParTXMTa»).
 * Regras conservadoras para não bloquear nomes reais (McDonald, DiCaprio, MacLeod…).
 */
export function isSuspiciousName(raw: string): boolean {
  const name = raw.trim();
  if (!name) return false;
  for (const word of name.split(/\s+/)) {
    const letters = word.replace(/[^\p{L}]/gu, "");
    if (letters.length > 20) return true;
    // Várias trocas minúscula→MAIÚSCULA dentro da mesma palavra (padrão aleatório).
    const caseSwitches = (letters.match(/\p{Ll}\p{Lu}/gu) ?? []).length;
    if (caseSwitches >= 2) return true;
  }
  return false;
}
