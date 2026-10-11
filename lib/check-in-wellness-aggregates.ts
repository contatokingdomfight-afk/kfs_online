/** Agregados do questionário pré-treino (PreLessonWellness) para o perfil do aluno. */

export type PreLessonWellnessRow = {
  sleepHours: number | string;
  /** null nos registos do questionário rápido (não perguntado). */
  sleepQuality: number | null;
  /** null nos registos do questionário rápido (não perguntado). */
  hydrationOk: boolean | null;
  stress: number;
  fatigue: number;
  wellnessZone: "GREEN" | "YELLOW" | "RED";
};

export type CheckInWellnessAggregates = {
  count: number;
  avgSleepHours: number;
  /** null quando nenhum registo tem qualidade do sono. */
  avgSleepQuality: number | null;
  /** null quando nenhum registo tem hidratação. */
  hydrationOkPercent: number | null;
  avgStress: number;
  avgFatigue: number;
  zoneShare: { green: number; yellow: number; red: number };
};

export function aggregateCheckInWellness(rows: PreLessonWellnessRow[]): CheckInWellnessAggregates | null {
  if (!rows.length) return null;
  const n = rows.length;
  let sumSleep = 0;
  let sumSq = 0;
  let nSq = 0;
  let sumStress = 0;
  let sumFat = 0;
  let hydrated = 0;
  let nHy = 0;
  let zG = 0;
  let zY = 0;
  let zR = 0;

  for (const r of rows) {
    const sh = typeof r.sleepHours === "string" ? Number(r.sleepHours) : r.sleepHours;
    sumSleep += Number.isFinite(sh) ? sh : 0;
    if (r.sleepQuality != null) {
      sumSq += r.sleepQuality;
      nSq++;
    }
    sumStress += r.stress;
    sumFat += r.fatigue;
    if (r.hydrationOk != null) {
      nHy++;
      if (r.hydrationOk) hydrated++;
    }
    if (r.wellnessZone === "GREEN") zG++;
    else if (r.wellnessZone === "YELLOW") zY++;
    else zR++;
  }

  return {
    count: n,
    avgSleepHours: sumSleep / n,
    avgSleepQuality: nSq > 0 ? sumSq / nSq : null,
    hydrationOkPercent: nHy > 0 ? (hydrated / nHy) * 100 : null,
    avgStress: sumStress / n,
    avgFatigue: sumFat / n,
    zoneShare: {
      green: (zG / n) * 100,
      yellow: (zY / n) * 100,
      red: (zR / n) * 100,
    },
  };
}
