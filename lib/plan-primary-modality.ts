/**
 * `Plan.modalityScope === "SINGLE"` (ex.: Presencial I): o aluno escolhe uma modalidade.
 * `ALL` ou `NONE`: não se usa modalidade única (MMA, FULL, Básico).
 */
export function planRequiresPrimaryModality(modalityScope: string | null | undefined): boolean {
  return modalityScope === "SINGLE";
}
