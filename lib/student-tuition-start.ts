import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";

/** Primeiro mês civil (Lisboa) em que o aluno pode ter mensalidade TUITION. */
export function tuitionStartMonthFromCreatedAt(createdAt: string | Date): string {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return formatInTimeZone(d, LISBON_TZ, "yyyy-MM");
}

export function isTuitionMonthBeforeEnrollment(referenceMonth: string, tuitionStartMonth: string): boolean {
  return referenceMonth < tuitionStartMonth;
}
