/** Avança referenceMonth YYYY-MM em N meses (calendário). */
export function addMonthsToReferenceMonth(referenceMonth: string, months: number): string {
  const m = referenceMonth.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error("referenceMonth inválido");
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = new Date(Date.UTC(y, mo + months, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

/** Lista N meses consecutivos a partir de startMonth (inclusivo). */
export function listConsecutiveReferenceMonths(startMonth: string, count: number): string[] {
  if (count < 1 || count > 12) throw new Error("count deve ser entre 1 e 12");
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(addMonthsToReferenceMonth(startMonth, i));
  }
  return out;
}
