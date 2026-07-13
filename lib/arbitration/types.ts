export type ArbitrationModality = "BOXING" | "MUAY_THAI";
export type ArbitrationFightStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ArbitrationCorner = "BLUE" | "RED" | "DRAW";
export type ArbitrationDecisionType = "UNANIMOUS" | "SPLIT" | "MAJORITY" | "DRAW";

export type CriteriaKey =
  | "offensiveVolume"
  | "strikePrecision"
  | "ringControl"
  | "movement"
  | "defense"
  | "technique";

export const CRITERIA_KEYS: CriteriaKey[] = [
  "offensiveVolume",
  "strikePrecision",
  "ringControl",
  "movement",
  "defense",
  "technique",
];

export const CRITERIA_LABELS_PT: Record<CriteriaKey, string> = {
  offensiveVolume: "Volume ofensivo",
  strikePrecision: "Precisão dos golpes",
  ringControl: "Controle do ringue",
  movement: "Movimentação",
  defense: "Defesa",
  technique: "Técnica",
};

export type CornerScores = Record<CriteriaKey, number | null>;

/** Pontuação por critério (ids dinâmicos conforme perfil do evento). */
export type DynamicCornerScores = Record<string, number | null>;

export type RoundScoresInput = {
  blue: DynamicCornerScores;
  red: DynamicCornerScores;
  officialBlueScore: number | null;
  officialRedScore: number | null;
};

export type CornerOccurrences = {
  illegalStrike: boolean;
  verbalWarning: boolean;
  pointDeduction: boolean;
  knockdown: boolean;
  count: boolean;
  excessiveHolding: boolean;
  lackOfAggressiveness: boolean;
  other: boolean;
};

export type OccurrenceInput = {
  blue: CornerOccurrences;
  red: CornerOccurrences;
  /** Pontos descontados do placar oficial 10-Point Must (0–3) */
  blueOfficialPointDeduction: number;
  redOfficialPointDeduction: number;
  notes: string;
};

export type ArbitrationCriterionDef = {
  id: string;
  label: string;
};

export type ArbitrationCriteriaSetRow = {
  id: string;
  name: string;
  criteria: ArbitrationCriterionDef[];
  isBuiltin: boolean;
};

export type ArbitrationEventRow = {
  id: string;
  name: string;
  eventDate: string | null;
  location: string | null;
  totalRoundsDefault: number;
  isActive: boolean;
  criteriaSetId?: string | null;
  criteriaSnapshot?: ArbitrationCriterionDef[] | null;
};

export type ArbitrationFightListRow = {
  id: string;
  eventId: string;
  eventName: string;
  modality: ArbitrationModality;
  category: string;
  weightClass: string | null;
  athleteBlueName: string;
  athleteRedName: string;
  status: ArbitrationFightStatus;
  totalRounds: number;
  currentRound: number;
  sortOrder: number;
  winner: ArbitrationCorner | null;
  decisionType: ArbitrationDecisionType | null;
};

export type ArbitrationJudgeRow = {
  id: string;
  displayName: string;
  userId: string | null;
  roleLabel?: string | null;
};

export type FightJudgeAssignment = {
  id: string;
  judgeNumber: number;
  judge: ArbitrationJudgeRow;
};

export type RoundEvaluationRow = {
  roundNumber: number;
  blueTotal: number | null;
  redTotal: number | null;
  officialBlueScore: number | null;
  officialRedScore: number | null;
  isLocked: boolean;
};

export type JudgeFightResultRow = {
  judgeNumber: number;
  judgeName: string;
  totalBlueOfficial: number;
  totalRedOfficial: number;
  winner: ArbitrationCorner;
};

export type JudgeHistoryRoundRow = {
  roundNumber: number;
  blueTotal: number | null;
  redTotal: number | null;
  officialBlueScore: number | null;
  officialRedScore: number | null;
};

export type JudgeHistoryCard = JudgeFightResultRow & {
  rounds: JudgeHistoryRoundRow[];
};

export type ArbitrationFightHistoryRow = ArbitrationFightListRow & {
  judgeCards: JudgeHistoryCard[];
};
