import {
  CRITERIA_KEYS,
  CRITERIA_LABELS_PT,
  type ArbitrationCriterionDef,
  type ArbitrationCriteriaSetRow,
  type ArbitrationModality,
  type CriteriaKey,
} from "./types";

export type { ArbitrationCriterionDef, ArbitrationCriteriaSetRow };

export const BUILTIN_KINGDOM_CRITERIA_SET_ID = "builtin-kingdom-6";
export const BUILTIN_MUAY_THAI_CRITERIA_SET_ID = "builtin-muay-thai";
export const BUILTIN_KICKBOXING_CRITERIA_SET_ID = "builtin-kickboxing";
export const BUILTIN_BOXING_CRITERIA_SET_ID = "builtin-boxing";

export const DEFAULT_CRITERIA_SET: ArbitrationCriteriaSetRow = {
  id: BUILTIN_KINGDOM_CRITERIA_SET_ID,
  name: "Kingdom (genérico)",
  isBuiltin: true,
  modalityCode: null,
  criteria: CRITERIA_KEYS.map((id) => ({
    id,
    label: CRITERIA_LABELS_PT[id as CriteriaKey],
  })),
};

/**
 * Perfis por modalidade — hierarquia de critérios conforme regulamentação de cada desporto
 * (FPKMT/IFMA/WMC para Muay Thai, FPKMT/WAKO para Kickboxing, FPB/IBA para Boxe).
 * Ordenados por prioridade de decisão: o 1.º critério pesa mais que o 2.º, etc.
 */
export const MUAY_THAI_CRITERIA_SET: ArbitrationCriteriaSetRow = {
  id: BUILTIN_MUAY_THAI_CRITERIA_SET_ID,
  name: "Muay Thai (IFMA/WMC)",
  isBuiltin: true,
  modalityCode: "MUAY_THAI",
  criteria: [
    {
      id: "effective_damage",
      label: "Dano efetivo",
      description:
        "Impacto acumulado pesa mais que volume: um pontapé médio limpo que desequilibra vale mais que vários socos leves bloqueados. Golpes com massa corporal (pontapés, joelhadas, cotoveladas) pesam mais que socos sem rotação de anca.",
    },
    {
      id: "clean_technique",
      label: "Técnica limpa",
      description:
        "O golpe só conta se atingir o alvo sem ser bloqueado/defletido pela guarda — nesse caso, a métrica conta a favor de quem defendeu. Boa mecânica (extensão, rotação de anca, estabilidade) reforça a pontuação.",
    },
    {
      id: "clinch_throws",
      label: "Clinch e projeções",
      description:
        "Domínio do clinch (controlo de nuca/mãos por dentro, joelhadas, quebra de postura) e projeções/varreduras legais de Muay Thai pontuam fortemente. Quem fica de pé numa projeção pontua; se ambos caírem, pontua quem fica por cima.",
    },
    {
      id: "posture_ring_generalship",
      label: "Postura e ring generalship",
      description:
        "Compostura ao sofrer um golpe (não demonstrar dor, manter a guarda) neutraliza o impacto aos olhos dos juízes. Avançar conectando pontua; avançar às cegas e ser contra-atacado conta para o adversário. Inclui controlo do espaço do ringue.",
    },
  ],
};

export const KICKBOXING_CRITERIA_SET: ArbitrationCriteriaSetRow = {
  id: BUILTIN_KICKBOXING_CRITERIA_SET_ID,
  name: "Kickboxing (FPKMT/WAKO)",
  isBuiltin: true,
  modalityCode: "KICKBOXING",
  criteria: [
    {
      id: "volume_combinations",
      label: "Volume e combinações",
      description:
        "Ao contrário do Muay Thai, o Kickboxing é um desporto de volume: sequências de socos/pontapés que entram limpas pontuam golpe a golpe (lógica do sistema de clicker). É o critério com mais peso.",
    },
    {
      id: "clean_connection",
      label: "Conexão limpa",
      description:
        "O golpe só pontua com alvo legal e área de contacto correta (luva ou tíbia/peito do pé); golpes nos antebraços/luvas valem 0. Precisa de força e trajetória de anca — toques fracos não contam.",
    },
    {
      id: "ring_generalship_restrictions",
      label: "Ring generalship e restrições",
      description:
        "Controlo do ringue e da distância. Clinch é proibido ou muito restrito (ex.: no K-1, 1 segundo para 1 joelhada) e cotoveladas são sempre proibidas. Algumas disciplinas exigem uma cota mínima de pontapés por assalto.",
    },
  ],
};

export const BOXING_CRITERIA_SET: ArbitrationCriteriaSetRow = {
  id: BUILTIN_BOXING_CRITERIA_SET_ID,
  name: "Boxe (FPB/IBA)",
  isBuiltin: true,
  modalityCode: "BOXING",
  criteria: [
    {
      id: "quality_blows",
      label: "Golpes válidos e qualificados",
      description:
        "Só conta se atingir zona de alvo legal (cabeça/tronco acima da cintura) com a zona dos nós dos dedos da luva fechada e carregar força de corpo/ombro/anca. Toques leves, socos estendidos ou golpes com a palma ('slapping') não pontuam.",
    },
    {
      id: "effective_aggressiveness",
      label: "Agressividade efetiva",
      description:
        "Avançar conectando golpes limpos pontua; avançar disparando socos retidos na guarda ou no ar, ou ser contra-atacado, conta a favor do adversário.",
    },
    {
      id: "ring_generalship",
      label: "Domínio do ringue",
      description:
        "Cortar o ringue, prender o adversário nas cordas/cantos, ditar a distância (jab à longa distância, infighting à curta) e controlar o centro do ringue.",
    },
    {
      id: "defence",
      label: "Defesa técnica",
      description:
        "Esquivas, bloqueios e footwork que fazem o adversário falhar golpes. Não ganha o assalto sozinha, mas desempata quando o volume de golpes limpos é parecido.",
    },
  ],
};

export const BUILTIN_CRITERIA_SETS: ArbitrationCriteriaSetRow[] = [
  DEFAULT_CRITERIA_SET,
  MUAY_THAI_CRITERIA_SET,
  KICKBOXING_CRITERIA_SET,
  BOXING_CRITERIA_SET,
];

export const BUILTIN_CRITERIA_SET_IDS = new Set(BUILTIN_CRITERIA_SETS.map((s) => s.id));

export function isBuiltinCriteriaSetId(id: string | null | undefined): boolean {
  return !!id && BUILTIN_CRITERIA_SET_IDS.has(id);
}

/** Perfil sugerido para uma modalidade (usado para pré-seleccionar ao criar um combate). */
export function defaultCriteriaSetForModality(modality: ArbitrationModality): ArbitrationCriteriaSetRow {
  return BUILTIN_CRITERIA_SETS.find((s) => s.modalityCode === modality) ?? DEFAULT_CRITERIA_SET;
}

const LEGACY_CRITERIA_DB_SUFFIX: Record<string, string> = {
  offensiveVolume: "OffensiveVolume",
  strikePrecision: "StrikePrecision",
  ringControl: "RingControl",
  movement: "Movement",
  defense: "Defense",
  technique: "Technique",
};

export const MIN_CRITERIA_COUNT = 3;
export const MAX_CRITERIA_COUNT = 8;

export function slugifyCriterionLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || "criterio";
}

export function normalizeCriteriaInput(
  labels: string[],
  existingIds?: string[]
): ArbitrationCriterionDef[] {
  const used = new Set<string>();
  return labels
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, MAX_CRITERIA_COUNT)
    .map((label, index) => {
      let id = existingIds?.[index] ?? slugifyCriterionLabel(label);
      if (!id) id = `criterio_${index + 1}`;
      let candidate = id;
      let n = 2;
      while (used.has(candidate)) {
        candidate = `${id}_${n}`;
        n++;
      }
      used.add(candidate);
      return { id: candidate, label };
    });
}

export function parseCriteriaSnapshot(raw: unknown): ArbitrationCriterionDef[] {
  if (!Array.isArray(raw) || raw.length < MIN_CRITERIA_COUNT) {
    return DEFAULT_CRITERIA_SET.criteria;
  }
  const parsed: ArbitrationCriterionDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    const label = (item as { label?: unknown }).label;
    const description = (item as { description?: unknown }).description;
    if (typeof id !== "string" || typeof label !== "string") continue;
    if (!id.trim() || !label.trim()) continue;
    parsed.push({
      id: id.trim(),
      label: label.trim(),
      ...(typeof description === "string" && description.trim() ? { description: description.trim() } : {}),
    });
  }
  if (parsed.length < MIN_CRITERIA_COUNT) return DEFAULT_CRITERIA_SET.criteria;
  return parsed.slice(0, MAX_CRITERIA_COUNT);
}

export function emptyDynamicScores(criteria: ArbitrationCriterionDef[]): Record<string, number | null> {
  return Object.fromEntries(criteria.map((c) => [c.id, null]));
}

export function legacyCriteriaColumnsFromScores(
  prefix: "blue" | "red",
  scores: Record<string, number | null>
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [id, suffix] of Object.entries(LEGACY_CRITERIA_DB_SUFFIX)) {
    const v = scores[id];
    out[`${prefix}${suffix}`] = typeof v === "number" ? v : null;
  }
  return out;
}

export function dynamicScoresFromEvaluationRow(
  row: Record<string, unknown>,
  criteria: ArbitrationCriterionDef[],
  corner: "blue" | "red"
): Record<string, number | null> {
  const json = row.criteriaScoresJson as { blue?: Record<string, number>; red?: Record<string, number> } | null;
  const fromJson = json?.[corner];
  if (fromJson && typeof fromJson === "object") {
    const result = emptyDynamicScores(criteria);
    for (const c of criteria) {
      const v = fromJson[c.id];
      result[c.id] = typeof v === "number" ? v : null;
    }
    return result;
  }

  const result = emptyDynamicScores(criteria);
  for (const c of criteria) {
    const suffix = LEGACY_CRITERIA_DB_SUFFIX[c.id];
    if (!suffix) continue;
    const col = `${corner}${suffix}`;
    const v = row[col];
    result[c.id] = typeof v === "number" ? v : null;
  }
  return result;
}

export function scoresJsonForDb(
  scores: Record<string, number | null>,
  criteria: ArbitrationCriterionDef[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of criteria) {
    const v = scores[c.id];
    if (typeof v === "number") out[c.id] = v;
  }
  return out;
}

export const PUBLIC_CRITERIA_PRESETS_STORAGE_KEY = "kfs-public-arbitration-criteria-presets";
