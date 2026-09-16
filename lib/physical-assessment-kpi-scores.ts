import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";

export type PhysicalKpiKey =
  | "scoreStrength"
  | "scoreEndurance"
  | "scoreSpeed"
  | "scoreCondition"
  | "scoreMobility"
  | "scoreCoordination";

export type PhysicalKpiDef = {
  key: PhysicalKpiKey;
  icon: string;
  labelPt: string;
  labelEn: string;
  tooltipPt: string;
  tooltipEn: string;
};

/** Ordem de exibição: força/resistência/velocidade primeiro (testes de esforço), depois condição/mobilidade/coordenação. */
export const PHYSICAL_KPI_DEFS: PhysicalKpiDef[] = [
  {
    key: "scoreStrength",
    icon: "💪",
    labelPt: "Força",
    labelEn: "Strength",
    tooltipPt:
      "Baseada nas flexões de braços feitas em 1 minuto, comparadas com tabelas de referência por idade e sexo. Mais repetições dentro da tua faixa etária → nota mais alta. O treinador pode ajustar a nota manualmente.",
    tooltipEn:
      "Based on push-ups done in 1 minute, compared against age and sex reference tables. More reps for your age band → higher score. The coach can adjust the score manually.",
  },
  {
    key: "scoreEndurance",
    icon: "🫀",
    labelPt: "Resistência",
    labelEn: "Endurance",
    tooltipPt:
      "Combina abdominais em 1 minuto e o ritmo de corrida (min/km), comparados com tabelas de referência. Reflete a tua capacidade de aguentar esforço prolongado. O treinador pode ajustar a nota manualmente.",
    tooltipEn:
      "Combines 1-minute sit-ups and run pace (min/km), compared against reference tables. Reflects your capacity to sustain effort over time. The coach can adjust the score manually.",
  },
  {
    key: "scoreSpeed",
    icon: "⚡",
    labelPt: "Velocidade",
    labelEn: "Speed",
    tooltipPt:
      "Estimada a partir do teu ritmo de corrida (min/km) — é uma aproximação, já que a ficha não inclui os testes oficiais de velocidade (20/40 m). O treinador pode ajustar a nota manualmente.",
    tooltipEn:
      "Estimated from your run pace (min/km) — an approximation, since the form doesn't include the official speed tests (20/40 m). The coach can adjust the score manually.",
  },
  {
    key: "scoreCondition",
    icon: "⚖️",
    labelPt: "Condição física",
    labelEn: "Physical condition",
    tooltipPt:
      "Baseada no teu IMC (peso ÷ altura²), comparado com a faixa saudável para a tua idade e sexo. Não mede diretamente gordura corporal ou composição muscular. O treinador pode ajustar a nota manualmente.",
    tooltipEn:
      "Based on your BMI (weight ÷ height²), compared against the healthy range for your age and sex. It doesn't directly measure body fat or muscle composition. The coach can adjust the score manually.",
  },
  {
    key: "scoreMobility",
    icon: "🤸",
    labelPt: "Mobilidade",
    labelEn: "Mobility",
    tooltipPt:
      "Baseada nas limitações de mobilidade e observações posturais assinaladas pelo treinador na ficha (ex.: ombro, anca, joelho, postura).",
    tooltipEn:
      "Based on the mobility limitations and postural notes the coach marked on the form (e.g. shoulder, hip, knee, posture).",
  },
  {
    key: "scoreCoordination",
    icon: "🎯",
    labelPt: "Coordenação",
    labelEn: "Coordination",
    tooltipPt:
      "Estimada pela média das notas de força, resistência e condição física — a ficha não inclui um teste específico de coordenação (ex.: 4×10 m). O treinador pode ajustar a nota manualmente.",
    tooltipEn:
      "Estimated from the average of the strength, endurance and condition scores — the form doesn't include a specific coordination test (e.g. 4×10 m shuttle). The coach can adjust the score manually.",
  },
];

export type PhysicalKpiScores = Partial<Record<PhysicalKpiKey, number | null>>;

export function extractPhysicalKpiScores(fd: Partial<PhysicalAssessmentFormData> | null | undefined): PhysicalKpiScores | null {
  if (!fd) return null;
  const scores: PhysicalKpiScores = {
    scoreStrength: fd.scoreStrength ?? null,
    scoreEndurance: fd.scoreEndurance ?? null,
    scoreSpeed: fd.scoreSpeed ?? null,
    scoreCondition: fd.scoreCondition ?? null,
    scoreMobility: fd.scoreMobility ?? null,
    scoreCoordination: fd.scoreCoordination ?? null,
  };
  const hasAny = Object.values(scores).some((v) => typeof v === "number");
  return hasAny ? scores : null;
}
