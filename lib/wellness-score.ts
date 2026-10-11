/** Zona de prontidão pré-treino (sem hardware). */

export type WellnessZone = "GREEN" | "YELLOW" | "RED";

export type WellnessCheckInInput = {
  sleepHours: number;
  /** 1–5; null = não perguntado (questionário rápido). */
  sleepQuality: number | null;
  /** null = não perguntado (questionário rápido). */
  hydrationOk: boolean | null;
  stress: number;
  fatigue: number;
};

/**
 * Heurística simples: sono baixo, mau sono, desidratação, stress/fadiga elevados → amarelo/vermelho.
 * Campos não perguntados (null) não somam risco. Ajustável sem alterar a BD (só lógica).
 */
export function computeWellnessZone(input: WellnessCheckInInput): WellnessZone {
  let risk = 0;
  if (input.sleepHours < 5) risk += 3;
  else if (input.sleepHours < 6) risk += 2;
  else if (input.sleepHours < 7) risk += 1;

  if (input.sleepQuality != null) {
    if (input.sleepQuality <= 2) risk += 2;
    else if (input.sleepQuality === 3) risk += 1;
  }

  if (input.hydrationOk === false) risk += 1;

  if (input.stress >= 5) risk += 2;
  else if (input.stress === 4) risk += 1;

  if (input.fatigue >= 5) risk += 2;
  else if (input.fatigue === 4) risk += 1;

  if (risk >= 5) return "RED";
  if (risk >= 2) return "YELLOW";
  return "GREEN";
}

/** Questionário rápido (3 perguntas, um toque cada). Os valores guardados mantêm as escalas antigas. */
export const QUICK_SLEEP = [
  { key: "lt5", pt: "< 5 h", en: "< 5 h", hours: 4.5 },
  { key: "5-6", pt: "5–6 h", en: "5–6 h", hours: 5.5 },
  { key: "6-7", pt: "6–7 h", en: "6–7 h", hours: 6.5 },
  { key: "7-8", pt: "7–8 h", en: "7–8 h", hours: 7.5 },
  { key: "8p", pt: "8+ h", en: "8+ h", hours: 8.5 },
] as const;

export const QUICK_BODY = [
  { key: "tired", pt: "Cansado", en: "Tired", fatigue: 5 },
  { key: "normal", pt: "Normal", en: "Normal", fatigue: 3 },
  { key: "fresh", pt: "Fresco", en: "Fresh", fatigue: 2 },
] as const;

export const QUICK_MIND = [
  { key: "stressed", pt: "Stressado", en: "Stressed", stress: 5 },
  { key: "normal", pt: "Normal", en: "Normal", stress: 3 },
  { key: "calm", pt: "Tranquilo", en: "Calm", stress: 2 },
] as const;

export type QuickWellnessAnswers = { sleep?: string | null; body?: string | null; mind?: string | null };

/** Respostas rápidas → registo. null quando falta alguma resposta. */
export function quickAnswersToWellness(a: QuickWellnessAnswers): WellnessCheckInInput | null {
  const sleep = QUICK_SLEEP.find((o) => o.key === a.sleep);
  const body = QUICK_BODY.find((o) => o.key === a.body);
  const mind = QUICK_MIND.find((o) => o.key === a.mind);
  if (!sleep || !body || !mind) return null;
  return { sleepHours: sleep.hours, sleepQuality: null, hydrationOk: null, stress: mind.stress, fatigue: body.fatigue };
}

export type ParsedWellness =
  | { ok: true; wellness: WellnessCheckInInput | "skip" }
  | { ok: false; error: string };

/**
 * Lê o questionário rápido do formulário (campos `wSleep`, `wBody`, `wMind`).
 * Sem respostas (ou `skipWellness`) → "skip"; respostas a meio → erro.
 */
export function parseWellnessFromFormData(formData: FormData): ParsedWellness {
  const skip = formData.get("skipWellness") === "1" || formData.get("skipWellness") === "on";
  if (skip) return { ok: true, wellness: "skip" };

  const answers = {
    sleep: (formData.get("wSleep") as string | null) || null,
    body: (formData.get("wBody") as string | null) || null,
    mind: (formData.get("wMind") as string | null) || null,
  };
  const answered = Object.values(answers).filter(Boolean).length;
  if (answered === 0) return { ok: true, wellness: "skip" };

  const wellness = quickAnswersToWellness(answers);
  if (!wellness) return { ok: false, error: "Responde às 3 perguntas, ou faz check-in sem responder." };
  return { ok: true, wellness };
}

/** Resumo de um registo para o coach (só os campos respondidos). */
export function wellnessSummaryText(w: {
  sleepHours: number | string;
  sleepQuality: number | null;
  hydrationOk: boolean | null;
  stress: number;
  fatigue: number;
}): string {
  const parts = [`Sono ${w.sleepHours}h`];
  if (w.sleepQuality != null) parts.push(`qualidade ${w.sleepQuality}/5`);
  if (w.hydrationOk != null) parts.push(`hidratação ${w.hydrationOk ? "ok" : "baixa"}`);
  parts.push(`stress ${w.stress}/5`, `fadiga ${w.fatigue}/5`);
  return parts.join(" · ");
}
