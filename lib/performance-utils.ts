import type { SupabaseClient } from "@supabase/supabase-js";

/** Eixos fixos do radar "Performance geral" (aluno). */
export const GENERAL_PERFORMANCE_AXES = [
  { id: "tecnico", label: "Técnico" },
  { id: "tatico", label: "Tático" },
  { id: "fisico", label: "Físico" },
  { id: "mental", label: "Mental" },
  { id: "teorico", label: "Teórico" },
] as const;

const GENERAL_DIMENSION_IDS = ["tecnico", "tatico", "fisico", "mental", "teorico"] as const;

function normalizeCategoryName(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** Mapeia nome de categoria do config para id da dimensão geral (ou null). */
export function categoryToGeneralDimension(categoryNome: string): (typeof GENERAL_DIMENSION_IDS)[number] | null {
  const n = normalizeCategoryName(categoryNome);
  if (n === "tecnico") return "tecnico";
  if (n === "tatico") return "tatico";
  if (n === "fisico") return "fisico";
  if (n === "mental") return "mental";
  if (n === "teorico") return "teorico";
  return null;
}

/** Converte uma avaliação legada (gas, technique, strength, theory 1–5) para as 5 dimensões gerais (escala 1–5). */
export function legacyEvaluationToGeneralScores(ev: {
  gas: number | null;
  technique: number | null;
  strength: number | null;
  theory: number | null;
}): Record<string, number> {
  const gas = ev.gas ?? 0;
  const technique = ev.technique ?? 0;
  const strength = ev.strength ?? 0;
  const theory = ev.theory ?? 0;
  const valid = (x: number) => x >= 1 && x <= 5;
  const g = valid(gas) ? gas : 0;
  const t = valid(technique) ? technique : 0;
  const s = valid(strength) ? strength : 0;
  const th = valid(theory) ? theory : 0;
  const count = [g, t, s, th].filter((x) => x > 0).length;
  const avg = count > 0 ? (g + t + s + th) / count : 0;
  return {
    tecnico: t || avg,
    tatico: count > 0 ? (t + th) / 2 : avg,
    fisico: count > 0 ? (g + s) / 2 : avg,
    mental: count > 0 ? (g + t + s + th) / 4 : avg,
    teorico: th || avg,
  };
}

export type GeneralScoresInputEval = {
  gas?: number | null;
  technique?: number | null;
  strength?: number | null;
  theory?: number | null;
  scores?: Record<string, number> | null;
  modality?: string | null;
};

export type ModalityConfig = {
  criterionToCategory: Map<string, string>;
  /** Quando definido, preferir para mapear criterionId -> dimensão (código). */
  criterionToDimensionCode?: Map<string, string>;
};

/** Calcula a média das dimensões gerais a partir das últimas N avaliações. Retorna scores 1–10 (escala do radar). */
export function computeGeneralPerformanceScores(
  evaluations: GeneralScoresInputEval[],
  configByModality: Map<string, ModalityConfig>,
  lastN: number,
  scale1to10: boolean
): Record<string, number> {
  const recent = evaluations.slice(0, lastN);
  const sums: Record<string, number[]> = {};
  GENERAL_DIMENSION_IDS.forEach((id) => (sums[id] = []));

  for (const ev of recent) {
    const hasScores = ev.scores && typeof ev.scores === "object" && Object.keys(ev.scores).length > 0;
    const modality = ev.modality ?? "";

    if (hasScores && modality && configByModality.has(modality)) {
      const { criterionToCategory, criterionToDimensionCode } = configByModality.get(modality)!;
      const byDim: Record<string, number[]> = {};
      GENERAL_DIMENSION_IDS.forEach((id) => (byDim[id] = []));
      for (const [criterionId, value] of Object.entries(ev.scores!)) {
        if (typeof value !== "number" || value < 1 || value > 10) continue;
        const dim =
          criterionToDimensionCode?.get(criterionId) ??
          (() => {
            const catNome = criterionToCategory.get(criterionId);
            return catNome ? categoryToGeneralDimension(catNome) : null;
          })();
        if (dim) {
          if (!byDim[dim]) byDim[dim] = [];
          byDim[dim].push(value);
        }
      }
      GENERAL_DIMENSION_IDS.forEach((dim) => {
        if (byDim[dim]?.length > 0) {
          const avg = byDim[dim].reduce((a, b) => a + b, 0) / byDim[dim].length;
          sums[dim].push(scale1to10 ? avg : avg / 2);
        }
      });
    } else {
      const leg = legacyEvaluationToGeneralScores({
        gas: ev.gas ?? null,
        technique: ev.technique ?? null,
        strength: ev.strength ?? null,
        theory: ev.theory ?? null,
      });
      const scale = scale1to10 ? 2 : 1;
      GENERAL_DIMENSION_IDS.forEach((dim) => {
        const v = leg[dim];
        if (v > 0) sums[dim].push(v * scale);
      });
    }
  }

  const result: Record<string, number> = {};
  const maxScore = scale1to10 ? 10 : 5;
  GENERAL_DIMENSION_IDS.forEach((dim) => {
    const arr = sums[dim];
    if (arr.length > 0) {
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      result[dim] = Math.round(Math.min(maxScore, Math.max(1, avg)) * 10) / 10;
    } else {
      result[dim] = 1;
    }
  });
  return result;
}

/** Conta presenças confirmadas por modalidade para um aluno. */
export async function getAttendanceByModality(
  supabase: SupabaseClient,
  studentId: string
): Promise<Record<string, number>> {
  const { data: attendances } = await supabase
    .from("Attendance")
    .select("lessonId")
    .eq("studentId", studentId)
    .eq("status", "CONFIRMED");
  if (!attendances?.length) return {};

  const lessonIds = [...new Set(attendances.map((a) => a.lessonId))];
  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, modality")
    .in("id", lessonIds);
  const modalityCount: Record<string, number> = {};
  (lessons ?? []).forEach((l) => {
    const m = l.modality as string;
    modalityCount[m] = (modalityCount[m] ?? 0) + 1;
  });
  return modalityCount;
}

export const RADAR_LABELS: Record<string, string> = {
  gas: "Gás",
  technique: "Técnica",
  strength: "Força",
  theory: "Teoria",
};

/** Labels das dimensões de avaliação por modalidade (para o coach na aula). */
export const EVALUATION_LABELS_BY_MODALITY: Record<
  string,
  { gas: string; technique: string; strength: string; theory: string }
> = {
  MUAY_THAI: {
    gas: "Condicionamento / Gás",
    technique: "Técnica (clinch, joelhos, cotovelos)",
    strength: "Força e potência",
    theory: "Conhecimento (regras, combate)",
  },
  BOXING: {
    gas: "Condicionamento / Gás",
    technique: "Técnica de punhos e defesa",
    strength: "Força e potência",
    theory: "Conhecimento (tática, combate)",
  },
  KICKBOXING: {
    gas: "Condicionamento / Gás",
    technique: "Técnica (pontapés, punhos)",
    strength: "Força e potência",
    theory: "Conhecimento (regras, combate)",
  },
};

export type RadarScores = { gas: number; technique: number; strength: number; theory: number };
