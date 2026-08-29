/** Segunda=1 … Domingo=7, igual à convenção de `Lesson.weekday`. Sem dependências de servidor — seguro em componentes cliente. */
export const PUBLIC_SCHEDULE_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function weekdayLabelForPublicSchedule(weekday: number, locale: "pt" | "en"): string {
  const pt = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const en = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const labels = locale === "en" ? en : pt;
  return labels[weekday] ?? "";
}

export function weekdayShortLabelForPublicSchedule(weekday: number, locale: "pt" | "en"): string {
  const pt = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const en = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const labels = locale === "en" ? en : pt;
  return labels[weekday] ?? "";
}
