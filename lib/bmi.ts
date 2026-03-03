/**
 * Cálculo de IMC e faixas (OMS).
 * Usado para metas de saúde no dashboard (ex.: "ficar na linha" / atingir faixa saudável).
 */

export type BMICategory =
  | "underweight"   // < 18.5
  | "normal"       // 18.5 - 24.99
  | "overweight"   // 25 - 29.99
  | "obesity";     // >= 30

export function computeBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return "underweight";
  if (bmi <= 24.99) return "normal";
  if (bmi <= 29.99) return "overweight";
  return "obesity";
}

const CATEGORY_LABELS_PT: Record<BMICategory, string> = {
  underweight: "Baixo peso",
  normal: "Peso saudável",
  overweight: "Sobrepeso",
  obesity: "Obesidade",
};

const CATEGORY_LABELS_EN: Record<BMICategory, string> = {
  underweight: "Underweight",
  normal: "Healthy weight",
  overweight: "Overweight",
  obesity: "Obesity",
};

export function getBMICategoryLabel(category: BMICategory, locale: "pt" | "en"): string {
  return locale === "en" ? CATEGORY_LABELS_EN[category] : CATEGORY_LABELS_PT[category];
}

/** Faixa saudável IMC (OMS). */
export const HEALTHY_BMI_MIN = 18.5;
export const HEALTHY_BMI_MAX = 24.99;

export type BMIGoalSuggestion = {
  hasGoal: boolean;
  /** Mensagem curta: "Atingir faixa saudável" ou "Manter faixa saudável" */
  messageKey: "bmiGoalReachHealthy" | "bmiGoalMaintainHealthy" | "bmiGoalGainHealthy";
  /** Para progresso: IMC alvo (ex. 24.9 se acima, 18.5 se abaixo). */
  targetBMI: number;
  currentBMI: number;
  category: BMICategory;
};

/**
 * Sugere uma meta de IMC com base na faixa atual.
 * - Normal: "Manter faixa saudável".
 * - Sobrepeso/obesidade: "Atingir faixa saudável" (alvo = 24.9).
 * - Baixo peso: "Atingir faixa saudável" (alvo = 18.5).
 */
export function getBMIGoalSuggestion(
  weightKg: number,
  heightCm: number
): BMIGoalSuggestion | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const bmi = computeBMI(weightKg, heightCm);
  const category = getBMICategory(bmi);

  if (category === "normal") {
    return {
      hasGoal: true,
      messageKey: "bmiGoalMaintainHealthy",
      targetBMI: bmi,
      currentBMI: bmi,
      category,
    };
  }
  if (category === "overweight" || category === "obesity") {
    return {
      hasGoal: true,
      messageKey: "bmiGoalReachHealthy",
      targetBMI: HEALTHY_BMI_MAX,
      currentBMI: bmi,
      category,
    };
  }
  // underweight
  return {
    hasGoal: true,
    messageKey: "bmiGoalGainHealthy",
    targetBMI: HEALTHY_BMI_MIN,
    currentBMI: bmi,
    category,
  };
}

/** Progresso em percentagem (0–100) em direção ao IMC alvo. Abaixo do peso: progresso até 18.5; acima: progresso até 24.9. */
export function getBMIProgressPct(suggestion: BMIGoalSuggestion): number {
  const { currentBMI, targetBMI, category } = suggestion;
  if (category === "normal") return 100;
  if (category === "underweight") {
    // current < 18.5, target 18.5
    if (currentBMI >= HEALTHY_BMI_MIN) return 100;
    const range = HEALTHY_BMI_MIN - 14; // 14–18.5 como escala
    const progress = currentBMI - 14;
    return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
  }
  // overweight / obesity: reduzir até 24.9
  if (currentBMI <= HEALTHY_BMI_MAX) return 100;
  const range = 40 - HEALTHY_BMI_MAX; // 25–40 como escala
  const progress = 40 - currentBMI;
  return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
}
