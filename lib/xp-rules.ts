/**
 * XP por modalidade (ranking v2): fontes de XP, textos e agregação do resumo do aluno.
 * Os valores vêm da tabela `XpRule` (editável em Admin → Regras de XP); o cálculo é feito em SQL
 * na vista `StudentXpEvent`.
 */

export const XP_SOURCES = [
  "ATTENDANCE",
  "PERFORMANCE",
  "PHYSICAL",
  "COURSE_LESSON",
  "COURSE_COMPLETED",
  "EXAM_PASSED",
  "EXAM_TAKEN",
] as const;
export type XpSource = (typeof XP_SOURCES)[number];

export const XP_SOURCE_META: Record<XpSource, { label: string; rule: (xp: number) => string; emoji: string }> = {
  ATTENDANCE: { label: "Presenças", emoji: "🥋", rule: (xp) => `${xp} XP por treino com presença confirmada` },
  PERFORMANCE: { label: "Avaliações de performance", emoji: "📈", rule: (xp) => `${xp} XP por ponto da média de cada avaliação (até ${xp * 10})` },
  PHYSICAL: { label: "Avaliações físicas", emoji: "💪", rule: (xp) => `${xp} XP por avaliação física` },
  COURSE_LESSON: { label: "Aulas da biblioteca", emoji: "📺", rule: (xp) => `${xp} XP por aula concluída` },
  COURSE_COMPLETED: { label: "Cursos concluídos", emoji: "🎓", rule: (xp) => `+${xp} XP por curso completo` },
  EXAM_PASSED: { label: "Exames aprovados", emoji: "🏅", rule: (xp) => `${xp} XP × número do grau obtido` },
  EXAM_TAKEN: { label: "Exames realizados", emoji: "📝", rule: (xp) => `${xp} XP por exame sem aprovação` },
};

export const DEFAULT_XP_RULES: Record<XpSource, number> = {
  ATTENDANCE: 10,
  PERFORMANCE: 5,
  PHYSICAL: 50,
  COURSE_LESSON: 5,
  COURSE_COMPLETED: 20,
  EXAM_PASSED: 100,
  EXAM_TAKEN: 25,
};

export function isXpSource(v: string): v is XpSource {
  return (XP_SOURCES as readonly string[]).includes(v);
}

export type XpSummaryRow = { modality_code: string | null; source: string; xp: number; events: number };

export type XpSummary = {
  total: number;
  /** XP sem modalidade (ex.: avaliações físicas, cursos gerais) — conta em todas as modalidades. */
  general: number;
  byModality: { code: string; xp: number }[];
  bySource: { source: XpSource; xp: number; events: number }[];
};

export function summarizeXp(rows: XpSummaryRow[]): XpSummary {
  const byModality = new Map<string, number>();
  const bySource = new Map<XpSource, { xp: number; events: number }>();
  let total = 0;
  let general = 0;
  for (const r of rows) {
    const xp = Number(r.xp) || 0;
    total += xp;
    if (r.modality_code) byModality.set(r.modality_code, (byModality.get(r.modality_code) ?? 0) + xp);
    else general += xp;
    if (isXpSource(r.source)) {
      const cur = bySource.get(r.source) ?? { xp: 0, events: 0 };
      bySource.set(r.source, { xp: cur.xp + xp, events: cur.events + (Number(r.events) || 0) });
    }
  }
  return {
    total,
    general,
    byModality: [...byModality.entries()].map(([code, xp]) => ({ code, xp })).sort((a, b) => b.xp - a.xp),
    bySource: XP_SOURCES.filter((s) => bySource.has(s)).map((s) => ({ source: s, ...bySource.get(s)! })),
  };
}

/** Normaliza o formulário de regras: inteiros entre 0 e 10000; fontes desconhecidas são ignoradas. */
export function parseXpRulesInput(input: Record<string, unknown>): { ok: true; rules: Record<XpSource, number> } | { ok: false; error: string } {
  const rules = { ...DEFAULT_XP_RULES };
  for (const source of XP_SOURCES) {
    const raw = input[source];
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 10000) {
      return { ok: false, error: `${XP_SOURCE_META[source].label}: indica um número inteiro entre 0 e 10000.` };
    }
    rules[source] = n;
  }
  return { ok: true, rules };
}
