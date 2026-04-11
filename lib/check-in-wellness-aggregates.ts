/** Agregados do questionário pré-treino (PreLessonWellness) para o perfil do aluno. */

export type PreLessonWellnessRow = {
  sleepHours: number | string;
  sleepQuality: number;
  hydrationOk: boolean;
  stress: number;
  fatigue: number;
  wellnessZone: "GREEN" | "YELLOW" | "RED";
};

export type CheckInWellnessAggregates = {
  count: number;
  avgSleepHours: number;
  avgSleepQuality: number;
  hydrationOkPercent: number;
  avgStress: number;
  avgFatigue: number;
  zoneShare: { green: number; yellow: number; red: number };
};

export function aggregateCheckInWellness(rows: PreLessonWellnessRow[]): CheckInWellnessAggregates | null {
  if (!rows.length) return null;
  const n = rows.length;
  let sumSleep = 0;
  let sumSq = 0;
  let sumStress = 0;
  let sumFat = 0;
  let hydrated = 0;
  let zG = 0;
  let zY = 0;
  let zR = 0;

  for (const r of rows) {
    const sh = typeof r.sleepHours === "string" ? Number(r.sleepHours) : r.sleepHours;
    sumSleep += Number.isFinite(sh) ? sh : 0;
    sumSq += r.sleepQuality;
    sumStress += r.stress;
    sumFat += r.fatigue;
    if (r.hydrationOk) hydrated++;
    if (r.wellnessZone === "GREEN") zG++;
    else if (r.wellnessZone === "YELLOW") zY++;
    else zR++;
  }

  return {
    count: n,
    avgSleepHours: sumSleep / n,
    avgSleepQuality: sumSq / n,
    hydrationOkPercent: (hydrated / n) * 100,
    avgStress: sumStress / n,
    avgFatigue: sumFat / n,
    zoneShare: {
      green: (zG / n) * 100,
      yellow: (zY / n) * 100,
      red: (zR / n) * 100,
    },
  };
}
