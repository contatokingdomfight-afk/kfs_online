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

/** Formata data da próxima aula: "Hoje", "Amanhã, 12 de Março" ou "12 de Março" (locale-aware). */
export function formatNextLessonDate(dateStr: string, locale: "pt" | "en" = "pt"): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lessonDay = new Date(date);
    lessonDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((lessonDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const loc = locale === "en" ? "en-GB" : "pt-PT";
    const datePart = date.toLocaleDateString(loc, { day: "numeric", month: "long" });
    if (diffDays === 0) return locale === "pt" ? "Hoje" : "Today";
    if (diffDays === 1) return locale === "pt" ? `Amanhã, ${datePart}` : `Tomorrow, ${datePart}`;
    return datePart;
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

const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Dado Monday em YYYY-MM-DD, devolve domingo da mesma semana em YYYY-MM-DD. */
export function getWeekEndSunday(mondayYYYYMMDD: string): string {
  const [y, m, d] = mondayYYYYMMDD.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, "0")}-${String(sun.getDate()).padStart(2, "0")}`;
}

/** Nome do dia da semana (0=domingo) para uma data YYYY-MM-DD. */
export function getWeekdayName(dateYYYYMMDD: string): string {
  const [y, m, d] = dateYYYYMMDD.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return WEEKDAY_NAMES[day] ?? "";
}

/** Formata intervalo da semana para exibição: "24 fev. – 2 mar. 2026". */
export function formatWeekRangeLabel(mondayYYYYMMDD: string): string {
  const [y, m, d] = mondayYYYYMMDD.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const monStr = mon.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  const sunStr = sun.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
  return `${monStr} – ${sunStr}`;
}

/** Segunda anterior / próxima a partir de uma segunda em YYYY-MM-DD. */
export function addWeeks(mondayYYYYMMDD: string, delta: number): string {
  const [y, m, d] = mondayYYYYMMDD.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
