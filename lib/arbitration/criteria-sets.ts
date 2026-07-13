import {
  CRITERIA_KEYS,
  CRITERIA_LABELS_PT,
  type ArbitrationCriterionDef,
  type ArbitrationCriteriaSetRow,
  type CriteriaKey,
} from "./types";

export type { ArbitrationCriterionDef, ArbitrationCriteriaSetRow };

export const BUILTIN_KINGDOM_CRITERIA_SET_ID = "builtin-kingdom-6";

export const DEFAULT_CRITERIA_SET: ArbitrationCriteriaSetRow = {
  id: BUILTIN_KINGDOM_CRITERIA_SET_ID,
  name: "Kingdom (padrão)",
  isBuiltin: true,
  criteria: CRITERIA_KEYS.map((id) => ({
    id,
    label: CRITERIA_LABELS_PT[id as CriteriaKey],
  })),
};

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
    if (typeof id !== "string" || typeof label !== "string") continue;
    if (!id.trim() || !label.trim()) continue;
    parsed.push({ id: id.trim(), label: label.trim() });
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
