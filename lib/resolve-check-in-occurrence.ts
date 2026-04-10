import { weekdayFromYmd } from "@/lib/lesson-occurrences";

/** Resolve YYYY-MM-DD da ocorrência para check-in (alinhado a `performCheckIn`). */
export function resolveOccurrenceYmd(
  lesson: { date: string | null; weekday?: number | null },
  options?: { occurrenceDate?: string }
): { ok: true; ymd: string } | { ok: false; error: string } {
  if (lesson.date != null && String(lesson.date).trim() !== "") {
    const ymd = String(lesson.date).slice(0, 10);
    if (options?.occurrenceDate && options.occurrenceDate.slice(0, 10) !== ymd) {
      return { ok: false, error: "Data inválida para esta aula." };
    }
    return { ok: true, ymd };
  }
  const occ = options?.occurrenceDate?.slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occ)) {
    return {
      ok: false,
      error: "Indica a data desta aula (ex.: abre o link a partir do dashboard com a data correta).",
    };
  }
  if (lesson.weekday != null && weekdayFromYmd(occ) !== lesson.weekday) {
    return { ok: false, error: "Data inválida para esta aula recorrente." };
  }
  return { ok: true, ymd: occ };
}
