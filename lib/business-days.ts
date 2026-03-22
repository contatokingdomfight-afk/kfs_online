/**
 * Contagem de dias úteis (seg–sex) em UTC.
 */

/** Avança `from` para o fim (23:59:59.999 UTC) do N-ésimo dia útil estritamente após `from`. */
export function addBusinessDaysUtc(from: Date, businessDays: number): Date {
  if (businessDays <= 0) {
    const d = new Date(from.getTime());
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }
  const d = new Date(from.getTime());
  let left = businessDays;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd >= 1 && wd <= 5) left--;
  }
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
