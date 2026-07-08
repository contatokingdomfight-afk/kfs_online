/** Formata valor monetário para input de texto (locale PT: vírgula decimal). */
export function formatDecimalAmountInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/**
 * Interpreta montantes em formulários PT: aceita "55", "55.5", "55,50", "1.234,56".
 */
export function parseDecimalAmount(raw: string | null | undefined): number | null {
  const cleaned = (raw ?? "").trim().replace(/\s/g, "");
  if (!cleaned) return null;

  let normalized: string;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  } else {
    normalized = cleaned;
  }

  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : n;
}
