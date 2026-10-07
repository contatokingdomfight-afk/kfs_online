/**
 * Template de graduação por modalidade: tipos partilhados entre o editor (cliente) e as actions,
 * e normalização/validação do payload antes de o gravar (RPC save_graduation_template).
 */

export const GRADUATION_AXES = ["TECNICO", "TATICO", "TEORICO", "FISICO"] as const;
export type GraduationAxis = (typeof GRADUATION_AXES)[number];

export const GRADUATION_AXIS_META: Record<GraduationAxis, { emoji: string; label: string; hint: string }> = {
  TECNICO: { emoji: "🥊", label: "Técnico", hint: "Como fazer" },
  TATICO: { emoji: "♟️", label: "Tático", hint: "Quando e por que usar" },
  TEORICO: { emoji: "📚", label: "Teórico / Filosofia", hint: "O que compreender" },
  FISICO: { emoji: "💪", label: "Físico", hint: "O que o corpo precisa ser capaz de executar" },
};

export type GraduationItemDraft = {
  id: string;
  axis: GraduationAxis;
  label: string;
  description: string | null;
  isCritical: boolean;
};

export type GraduationRequirementDraft = { id: string; label: string };

export type GraduationCourseDraft = { courseId: string; isRequired: boolean };

export type GraduationGradeDraft = {
  id: string;
  name: string;
  subtitle: string | null;
  motto: string | null;
  objective: string | null;
  notes: string | null;
  colors: string[];
  minMonths: number;
  minAttendances: number | null;
  minPerformanceAvg: number | null;
  physicalAssessmentMaxAgeMonths: number | null;
  passMinAxisAvg: number;
  items: GraduationItemDraft[];
  courses: GraduationCourseDraft[];
  requirements: GraduationRequirementDraft[];
};

export type GraduationTemplateDraft = {
  modalityCode: string;
  name: string;
  isPublished: boolean;
  monthlyMinAttendances: number;
  grades: GraduationGradeDraft[];
};

export const MAX_GRADES = 30;
export const MAX_COLORS_PER_GRADE = 4;
const MAX_LABEL = 300;
const MAX_TEXT = 4000;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Tempo acumulado (meses) para obter cada grau: soma dos mínimos até esse grau, inclusive. */
export function accumulatedMonths(grades: Pick<GraduationGradeDraft, "minMonths">[]): number[] {
  let total = 0;
  return grades.map((g) => (total += Math.max(0, g.minMonths || 0)));
}

/** Converte uma lista colada (uma linha por item) em rótulos; remove marcadores e linhas vazias. */
export function parsePastedItemLabels(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, "").trim())
    .map((l) => l.replace(/[.;]\s*$/, "").trim())
    .filter(Boolean);
}

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function intOrNull(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function scoreOrNull(v: unknown, max = 5): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(max, Math.max(1, n)) * 100) / 100;
}

function id(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(v) ? v : null;
}

export type NormalizeResult =
  | { ok: true; draft: GraduationTemplateDraft }
  | { ok: false; error: string };

/**
 * Limpa e valida o payload vindo do editor. Itens/requisitos sem texto são descartados;
 * números fora do intervalo são ajustados. Erros só para o que o admin precisa corrigir.
 */
export function normalizeTemplateDraft(input: unknown): NormalizeResult {
  if (!input || typeof input !== "object") return { ok: false, error: "Dados inválidos." };
  const raw = input as Record<string, unknown>;

  const modalityCode = text(raw.modalityCode, 64);
  if (!modalityCode) return { ok: false, error: "Modalidade em falta." };
  const name = text(raw.name, 120);
  if (!name) return { ok: false, error: "Dá um nome ao template." };

  const rawGrades = Array.isArray(raw.grades) ? raw.grades : [];
  if (rawGrades.length > MAX_GRADES) return { ok: false, error: `Máximo de ${MAX_GRADES} graus.` };

  const seenIds = new Set<string>();
  const uniqueId = (v: unknown): string | null => {
    const value = id(v);
    if (!value || seenIds.has(value)) return null;
    seenIds.add(value);
    return value;
  };

  const grades: GraduationGradeDraft[] = [];
  for (let i = 0; i < rawGrades.length; i++) {
    const g = (rawGrades[i] ?? {}) as Record<string, unknown>;
    const gradeId = uniqueId(g.id);
    if (!gradeId) return { ok: false, error: `Grau ${i + 1}: identificador inválido.` };
    const gradeName = text(g.name, 80);
    if (!gradeName) return { ok: false, error: `Grau ${i + 1}: o nome é obrigatório.` };

    const colors = (Array.isArray(g.colors) ? g.colors : [])
      .filter((c): c is string => typeof c === "string" && HEX_COLOR.test(c))
      .map((c) => c.toUpperCase())
      .slice(0, MAX_COLORS_PER_GRADE);

    const items: GraduationItemDraft[] = [];
    for (const rawItem of Array.isArray(g.items) ? g.items : []) {
      const it = (rawItem ?? {}) as Record<string, unknown>;
      const label = text(it.label, MAX_LABEL);
      if (!label) continue;
      const itemId = uniqueId(it.id);
      if (!itemId) return { ok: false, error: `Grau "${gradeName}": item com identificador inválido.` };
      const axis = GRADUATION_AXES.includes(it.axis as GraduationAxis) ? (it.axis as GraduationAxis) : null;
      if (!axis) return { ok: false, error: `Grau "${gradeName}": eixo inválido no item "${label}".` };
      items.push({ id: itemId, axis, label, description: text(it.description, MAX_TEXT), isCritical: it.isCritical === true });
    }

    const requirements: GraduationRequirementDraft[] = [];
    for (const rawReq of Array.isArray(g.requirements) ? g.requirements : []) {
      const r = (rawReq ?? {}) as Record<string, unknown>;
      const label = text(r.label, MAX_LABEL);
      if (!label) continue;
      const reqId = uniqueId(r.id);
      if (!reqId) return { ok: false, error: `Grau "${gradeName}": requisito com identificador inválido.` };
      requirements.push({ id: reqId, label });
    }

    const courseIds = new Set<string>();
    const courses: GraduationCourseDraft[] = [];
    for (const rawCourse of Array.isArray(g.courses) ? g.courses : []) {
      const c = (rawCourse ?? {}) as Record<string, unknown>;
      const courseId = text(c.courseId, 64);
      if (!courseId || courseIds.has(courseId)) continue;
      courseIds.add(courseId);
      courses.push({ courseId, isRequired: c.isRequired !== false });
    }

    grades.push({
      id: gradeId,
      name: gradeName,
      subtitle: text(g.subtitle, 120),
      motto: text(g.motto, 160),
      objective: text(g.objective, MAX_TEXT),
      notes: text(g.notes, MAX_TEXT),
      colors,
      minMonths: intOrNull(g.minMonths, 0, 240) ?? 0,
      minAttendances: intOrNull(g.minAttendances, 0, 5000),
      // Avaliações de performance dos treinadores: escala 1–10 (radar). Exame: 1–5.
      minPerformanceAvg: scoreOrNull(g.minPerformanceAvg, 10),
      physicalAssessmentMaxAgeMonths: intOrNull(g.physicalAssessmentMaxAgeMonths, 1, 60),
      passMinAxisAvg: scoreOrNull(g.passMinAxisAvg) ?? 3,
      items,
      courses,
      requirements,
    });
  }

  return {
    ok: true,
    draft: {
      modalityCode,
      name,
      isPublished: raw.isPublished === true,
      monthlyMinAttendances: intOrNull(raw.monthlyMinAttendances, 1, 31) ?? 4,
      grades,
    },
  };
}

/** Avisos não bloqueantes mostrados antes de publicar (template incompleto). */
export function templatePublishWarnings(draft: GraduationTemplateDraft): string[] {
  const warnings: string[] = [];
  if (draft.grades.length === 0) warnings.push("O template não tem graus.");
  for (const g of draft.grades) {
    const missing = GRADUATION_AXES.filter((a) => !g.items.some((i) => i.axis === a));
    if (missing.length > 0) {
      warnings.push(`${g.name}: sem itens em ${missing.map((a) => GRADUATION_AXIS_META[a].label).join(", ")}.`);
    }
    if (g.colors.length === 0) warnings.push(`${g.name}: sem cor definida.`);
  }
  return warnings;
}
