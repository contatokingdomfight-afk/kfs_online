/**
 * Estrutura do formData da Ficha de Anamnese e Avaliação Física (JSON em StudentPhysicalAssessment).
 */

export type PhysicalAssessmentFormData = {
  /** 2. Objetivo do aluno */
  objectives?: string[];
  objectiveOther?: string;
  /** 3.1 Condições médicas */
  medicalConditions?: string[];
  medicalConditionsOther?: string;
  /** 3.2 Medicação */
  usesMedication?: boolean;
  medicationDetail?: string;
  /** 3.3 Lesões */
  hasInjuries?: boolean;
  injuries?: { region?: string; type?: string; year?: string; recovered?: boolean }[];
  /** 4. PAR-Q */
  parqChestPain?: boolean;
  parqFainted?: boolean;
  parqBoneJoint?: boolean;
  parqDoctorLimit?: boolean;
  parqOther?: boolean;
  /** 5. Atividade */
  activityLevel?: "SEDENTARIO" | "ATIVO_OCASIONAL" | "ATIVO_REGULAR" | "MUITO_ATIVO";
  previousMartialArts?: boolean;
  previousModality?: string;
  previousPracticeTime?: string;
  /** 6.1 Sinais vitais */
  heartRateRest?: number | null;
  bloodPressure?: string | null;
  saturationO2?: string | null;
  /** 6.2 Mobilidade */
  mobilityLimitations?: string[];
  mobilityNotes?: string;
  /** 6.3 Postural */
  posturalAssessment?: string[];
  posturalNotes?: string;
  /** 7. Testes físicos */
  pushups1min?: number | null;
  situps1min?: number | null;
  plankSeconds?: number | null;
  squats1min?: number | null;
  runTest?: string | null;
  /** 8. Avaliação instrutor (1-10) */
  scoreCondition?: number | null;
  scoreMobility?: number | null;
  scoreCoordination?: number | null;
  scoreEndurance?: number | null;
  scoreStrength?: number | null;
  instructorNotes?: string;
  /** 9. Termo */
  signatureDate?: string;
  /** 10. Liberação já em clearance (coluna) */
};

export const OBJECTIVE_OPTIONS = [
  { value: "CONDICIONAMENTO", label: "Condicionamento físico" },
  { value: "DEFESA", label: "Defesa pessoal" },
  { value: "COMPETICAO", label: "Competição" },
  { value: "EMAGRECIMENTO", label: "Emagrecimento" },
  { value: "MASSA", label: "Ganho de massa muscular" },
  { value: "LAZER", label: "Lazer" },
] as const;

export const MEDICAL_CONDITIONS = [
  "CARDIACO", "HIPERTENSAO", "DIABETES", "ASMA", "ARTICULAR", "COLUNA", "EPILEPSIA", "NENHUMA"
] as const;
export const MEDICAL_CONDITIONS_LABELS: Record<string, string> = {
  CARDIACO: "Problemas cardíacos",
  HIPERTENSAO: "Hipertensão",
  DIABETES: "Diabetes",
  ASMA: "Asma / problemas respiratórios",
  ARTICULAR: "Problemas articulares",
  COLUNA: "Problemas de coluna",
  EPILEPSIA: "Epilepsia",
  NENHUMA: "Nenhuma condição conhecida",
};

export const ACTIVITY_LEVELS = [
  { value: "SEDENTARIO", label: "Sedentário" },
  { value: "ATIVO_OCASIONAL", label: "Ativo ocasional (1–2x/semana)" },
  { value: "ATIVO_REGULAR", label: "Ativo regular (3–4x/semana)" },
  { value: "MUITO_ATIVO", label: "Muito ativo (5x+/semana)" },
] as const;

export const MOBILITY_OPTIONS = [
  "OMBRO", "ANCA", "JOELHO", "TORNOZELO", "BOA_GERAL"
] as const;
export const MOBILITY_LABELS: Record<string, string> = {
  OMBRO: "Limitação de ombro",
  ANCA: "Limitação de anca",
  JOELHO: "Limitação de joelho",
  TORNOZELO: "Limitação de tornozelo",
  BOA_GERAL: "Boa mobilidade geral",
};

export const POSTURAL_OPTIONS = [
  "NORMAL", "CABECA_ANTERIOR", "OMBROS_PROTRUIDOS", "HIPERCIFOSE", "HIPERLORDOSE", "ESCOLIOSE"
] as const;
export const POSTURAL_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  CABECA_ANTERIOR: "Cabeça anteriorizada",
  OMBROS_PROTRUIDOS: "Ombros protraídos",
  HIPERCIFOSE: "Hipercifose",
  HIPERLORDOSE: "Hiperlordose",
  ESCOLIOSE: "Escoliose aparente",
};

export const CLEARANCE_OPTIONS = [
  { value: "APTO", label: "Apto para treino" },
  { value: "APTO_RESTRICOES", label: "Apto com restrições" },
  { value: "NECESSITA_AVALIACAO_MEDICA", label: "Necessita avaliação médica" },
] as const;
