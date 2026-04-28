/**
 * Códigos de modalidade alinhados a `Student.primaryModality`, `Lesson.modality` e `WeekTheme.modality`.
 * Usar nas comparações em vez de strings cruas.
 */
const MODALITY_ALIASES: Record<string, string> = {
  MUAY_THAI: "MUAY_THAI",
  "MUAY THAI": "MUAY_THAI",
  MUAYTHAI: "MUAY_THAI",
  BOXING: "BOXING",
  KICKBOXING: "KICKBOXING",
  "KICK BOXING": "KICKBOXING",
  MMA: "MMA",
};

export function normalizeModalityCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toUpperCase();
  return MODALITY_ALIASES[key] ?? null;
}
