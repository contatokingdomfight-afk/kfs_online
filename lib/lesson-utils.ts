/** Valor especial: todas as modalidades (ex.: plano Presencial MMA). */
export const PRIMARY_MODALITY_ALL = "ALL";

/** Labels das modalidades. Ao adicionar nova modalidade aqui, os badges de gamificação (10, 20, 30... aulas) são gerados automaticamente. */
export const MODALITY_LABELS: Record<string, string> = {
  [PRIMARY_MODALITY_ALL]: "Todas as modalidades",
  MUAY_THAI: "Muay Thai",
  BOXING: "Boxing",
  KICKBOXING: "Kickboxing",
};

export function formatLessonDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

/** Retorna hoje e o domingo da semana atual em YYYY-MM-DD (timezone local do servidor). */
export function getThisWeekRange(): { today: string; endOfWeek: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const today = new Date(y, m, day);
  const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, ...
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 6 - dayOfWeek;
  const endOfWeek = new Date(y, m, day + daysUntilSunday);

  const toYYYYMMDD = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return { today: toYYYYMMDD(today), endOfWeek: toYYYYMMDD(endOfWeek) };
}

/** Segunda-feira da semana de uma data em YYYY-MM-DD. */
export function getWeekStartMondayForDate(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(copy.getFullYear(), copy.getMonth(), diff);
  const y = monday.getFullYear();
  const m = monday.getMonth() + 1;
  const dayNum = monday.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
}

/** Segunda-feira da semana atual em YYYY-MM-DD (para Tema da Semana). */
export function getWeekStartMonday(): string {
  return getWeekStartMondayForDate(new Date());
}
