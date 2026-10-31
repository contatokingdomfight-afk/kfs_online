/**
 * Estado de uma escola e o que falta para a abrir (ecrã do Admin Geral, ver DOCS/mockup-escolas-diretores.html).
 * Regras puras (testáveis). O estado deriva de `isActive` + `openedAt`.
 */
export type SchoolStatus = "PREPARACAO" | "ATIVA" | "DESATIVADA";

export function schoolStatus(school: { isActive: boolean; openedAt: string | null }): SchoolStatus {
  if (school.isActive) return "ATIVA";
  return school.openedAt ? "DESATIVADA" : "PREPARACAO";
}

export const SCHOOL_STATUS_LABEL: Record<SchoolStatus, string> = {
  PREPARACAO: "Em preparação",
  ATIVA: "Ativa",
  DESATIVADA: "Desativada",
};

export type SchoolPaymentMethods = {
  ibanEnabled: boolean;
  iban: string | null;
  mbwayEnabled: boolean;
  mbwayPhone: string | null;
  revolutEnabled: boolean;
  multibancoEnabled: boolean;
};

/** O dinheiro vivo não conta: `cashEnabled` vem ligado por omissão e não prova que a escola está pronta a cobrar. */
export function hasPaymentMethod(settings: SchoolPaymentMethods | null | undefined): boolean {
  if (!settings) return false;
  return (
    (settings.ibanEnabled && Boolean(settings.iban)) ||
    (settings.mbwayEnabled && Boolean(settings.mbwayPhone)) ||
    settings.revolutEnabled ||
    settings.multibancoEnabled
  );
}

/** O que impede a abertura; vazio = pode abrir. */
export function missingToOpen(directorCount: number, settings: SchoolPaymentMethods | null | undefined): string[] {
  const missing: string[] = [];
  if (directorCount === 0) missing.push("diretor");
  if (!hasPaymentMethod(settings)) missing.push("meio de pagamento");
  return missing;
}
