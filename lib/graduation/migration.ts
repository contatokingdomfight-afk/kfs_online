/**
 * Migração das faixas antigas (por XP) para graus de graduação.
 * Regra acordada: grau equivalente por posição (faixa antiga k → k-ésimo grau; a faixa inicial
 * "Branca" = sem graduação), limitado ao grau cujo tempo acumulado o aluno já tem registado.
 * É só uma proposta: o admin confirma ou ajusta aluno a aluno antes de aplicar.
 */

import { accumulatedMonths } from "./template";

export type MigrationReason = "STARTING_BELT" | "LEGACY_MATCH" | "CAPPED_BY_TIME" | "NO_ATHLETE";

export type MigrationProposal = {
  /** Índice do grau proposto no template (-1 = sem graduação). */
  gradeIndex: number;
  reason: MigrationReason;
};

export function proposeMigrationGrade(
  legacyBeltIndex: number | null,
  qualifyingMonths: number,
  grades: { minMonths: number }[]
): MigrationProposal {
  if (legacyBeltIndex == null) return { gradeIndex: -1, reason: "NO_ATHLETE" };
  if (legacyBeltIndex <= 0) return { gradeIndex: -1, reason: "STARTING_BELT" };

  const byBelt = Math.min(legacyBeltIndex, grades.length) - 1;
  const acc = accumulatedMonths(grades);
  let byTime = -1;
  acc.forEach((months, i) => {
    if (months <= qualifyingMonths) byTime = i;
  });

  return byTime < byBelt ? { gradeIndex: byTime, reason: "CAPPED_BY_TIME" } : { gradeIndex: byBelt, reason: "LEGACY_MATCH" };
}

export const MIGRATION_REASON_LABEL: Record<MigrationReason, string> = {
  STARTING_BELT: "Faixa inicial",
  LEGACY_MATCH: "Equivalente à faixa",
  CAPPED_BY_TIME: "Limitado pelo tempo registado",
  NO_ATHLETE: "Sem histórico de XP",
};
