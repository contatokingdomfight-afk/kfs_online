/** Zona de prontidão pré-treino (sem hardware). */

export type WellnessZone = "GREEN" | "YELLOW" | "RED";

export type WellnessCheckInInput = {
  sleepHours: number;
  sleepQuality: number;
  hydrationOk: boolean;
  stress: number;
  fatigue: number;
};

/**
 * Heurística simples: sono baixo, mau sono, desidratação, stress/fadiga elevados → amarelo/vermelho.
 * Ajustável sem alterar a BD (só lógica).
 */
export function computeWellnessZone(input: WellnessCheckInInput): WellnessZone {
  let risk = 0;
  if (input.sleepHours < 5) risk += 3;
  else if (input.sleepHours < 6) risk += 2;
  else if (input.sleepHours < 7) risk += 1;

  if (input.sleepQuality <= 2) risk += 2;
  else if (input.sleepQuality === 3) risk += 1;

  if (!input.hydrationOk) risk += 1;

  if (input.stress >= 5) risk += 2;
  else if (input.stress === 4) risk += 1;

  if (input.fatigue >= 5) risk += 2;
  else if (input.fatigue === 4) risk += 1;

  if (risk >= 5) return "RED";
  if (risk >= 2) return "YELLOW";
  return "GREEN";
}

export type ParsedWellness =
  | { ok: true; wellness: WellnessCheckInInput | "skip" }
  | { ok: false; error: string };

export function parseWellnessFromFormData(formData: FormData): ParsedWellness {
  const skip = formData.get("skipWellness") === "1" || formData.get("skipWellness") === "on";
  if (skip) return { ok: true, wellness: "skip" };

  const sleepHours = Number(formData.get("sleepHours"));
  const sleepQuality = Number(formData.get("sleepQuality"));
  const stress = Number(formData.get("stress"));
  const fatigue = Number(formData.get("fatigue"));
  const hydrationOk = formData.get("hydrationOk") === "1";

  if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24) {
    return { ok: false, error: "Horas de sono inválidas." };
  }
  if (![1, 2, 3, 4, 5].includes(sleepQuality)) {
    return { ok: false, error: "Qualidade do sono inválida." };
  }
  if (![1, 2, 3, 4, 5].includes(stress) || ![1, 2, 3, 4, 5].includes(fatigue)) {
    return { ok: false, error: "Valores de stress/fadiga inválidos." };
  }

  return {
    ok: true,
    wellness: {
      sleepHours,
      sleepQuality,
      hydrationOk,
      stress,
      fatigue,
    },
  };
}
