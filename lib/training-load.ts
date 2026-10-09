/**
 * Carga de treino (session-RPE): carga = esforço (RPE 1–10) × minutos da aula.
 * Rácio agudo:crónico = carga dos últimos 7 dias ÷ média semanal das (até) 4 semanas anteriores.
 * Datas sempre em YYYY-MM-DD (dia de Lisboa); funções puras, sem I/O.
 */

export type TrainingSession = {
  /** Dia da aula (YYYY-MM-DD). */
  date: string;
  /** Esforço 1–10; null = o aluno ainda não deu nota (não entra na carga). */
  rpe: number | null;
  minutes: number;
};

export type TrainingLoadZone = "low" | "ideal" | "caution" | "high" | "insufficient";

export type TrainingLoadSummary = {
  /** Carga dos últimos 7 dias (hoje incluído). */
  acute: number;
  /** Média semanal das semanas anteriores (até 4); null sem histórico suficiente. */
  chronic: number | null;
  ratio: number | null;
  zone: TrainingLoadZone;
  /** Treinos com nota nos últimos 7 dias. */
  sessions7d: number;
  /** Treinos dos últimos 7 dias ainda sem nota (carga subestimada). */
  unrated7d: number;
  /** Últimos 7 dias, do mais antigo para hoje. */
  days: { date: string; load: number; rpe: number | null; trained: boolean }[];
  /** 8 blocos de 7 dias, do mais antigo para o actual. */
  weeks: { end: string; load: number }[];
};

/** Mínimo de histórico antes da semana actual para haver rácio (2 semanas + a actual = 3). */
export const MIN_HISTORY_DAYS = 14;

export const ZONE_LIMITS = { low: 0.8, ideal: 1.3, caution: 1.5 } as const;

export function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Minutos entre "HH:MM" e "HH:MM" (60 se não der para calcular). */
export function lessonMinutes(startTime?: string | null, endTime?: string | null): number {
  const toMin = (s?: string | null) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(s ?? "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const a = toMin(startTime);
  const b = toMin(endTime);
  if (a == null || b == null || b <= a) return 60;
  return Math.min(240, b - a);
}

export function zoneForRatio(ratio: number | null): TrainingLoadZone {
  if (ratio == null) return "insufficient";
  if (ratio < ZONE_LIMITS.low) return "low";
  if (ratio <= ZONE_LIMITS.ideal) return "ideal";
  if (ratio <= ZONE_LIMITS.caution) return "caution";
  return "high";
}

const loadOf = (s: TrainingSession) => (s.rpe != null && s.rpe >= 1 ? s.rpe * Math.max(0, s.minutes) : 0);

export function computeTrainingLoad(sessions: TrainingSession[], today: string): TrainingLoadSummary {
  const acuteStart = addDays(today, -6);
  const valid = sessions.filter((s) => s.date && s.date <= today);
  const rated = valid.filter((s) => s.rpe != null && s.rpe >= 1);

  const sumBetween = (from: string, to: string) =>
    rated.filter((s) => s.date >= from && s.date <= to).reduce((acc, s) => acc + loadOf(s), 0);

  const acute = sumBetween(acuteStart, today);
  const inAcute = valid.filter((s) => s.date >= acuteStart);
  const sessions7d = inAcute.filter((s) => s.rpe != null && s.rpe >= 1).length;
  const unrated7d = inAcute.length - sessions7d;

  // Base: semanas anteriores à actual, desde o 1.º treino com nota (no máximo 4).
  // A semana do 1.º treino conta inteira (senão um início a meio da semana inflaciona a média).
  const firstRated = rated.reduce<string | null>((min, s) => (min == null || s.date < min ? s.date : min), null);
  const historyDays = firstRated ? daysBetween(firstRated, acuteStart) : 0;
  let chronic: number | null = null;
  if (historyDays >= MIN_HISTORY_DAYS) {
    const weeks = Math.min(4, Math.ceil(historyDays / 7));
    chronic = sumBetween(addDays(acuteStart, -7 * weeks), addDays(acuteStart, -1)) / weeks;
  }
  const ratio = chronic != null && chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(acuteStart, i);
    const onDay = valid.filter((s) => s.date === date);
    const rpes = onDay.map((s) => s.rpe).filter((r): r is number => r != null && r >= 1);
    return {
      date,
      load: onDay.reduce((acc, s) => acc + loadOf(s), 0),
      rpe: rpes.length ? Math.max(...rpes) : null,
      trained: onDay.length > 0,
    };
  });

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(today, -7 * (7 - i));
    return { end, load: sumBetween(addDays(end, -6), end) };
  });

  return { acute, chronic: chronic == null ? null : Math.round(chronic), ratio, zone: zoneForRatio(ratio), sessions7d, unrated7d, days, weeks };
}

/** Ordem de risco para listas (mais grave primeiro). */
export const ZONE_RISK_ORDER: Record<TrainingLoadZone, number> = { high: 0, caution: 1, low: 2, ideal: 3, insufficient: 4 };

export const ZONE_COLORS: Record<TrainingLoadZone, string> = {
  low: "#60a5fa",
  ideal: "#4ade80",
  caution: "#fbbf24",
  high: "#f87171",
  insufficient: "#a1a1aa",
};

export function zoneLabel(zone: TrainingLoadZone, pt: boolean): string {
  const labels: Record<TrainingLoadZone, [string, string]> = {
    low: ["Carga baixa", "Low load"],
    ideal: ["Carga ideal", "Ideal load"],
    caution: ["Atenção", "Caution"],
    high: ["Carga alta", "High load"],
    insufficient: ["Sem base ainda", "Not enough data"],
  };
  return labels[zone][pt ? 0 : 1];
}
