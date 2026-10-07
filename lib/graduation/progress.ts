/**
 * Progresso do aluno numa modalidade: grau atual, próximo grau e o que falta para ficar
 * "apto para exame". Funções puras — os dados são carregados em load-student-progress.ts.
 *
 * Regras:
 * - O aluno sem registo em StudentGrade está "sem graduação"; o próximo grau é o primeiro.
 * - Tempo: conta meses com pelo menos N presenças confirmadas na modalidade. Exige-se o mínimo
 *   do grau desde a última graduação E o acumulado (soma dos mínimos até ao grau) desde sempre.
 * - O exame é cumulativo: avalia os itens do próximo grau e de todos os graus anteriores.
 */

import {
  accumulatedMonths,
  GRADUATION_AXES,
  type GraduationAxis,
  type GraduationGradeDraft,
  type GraduationItemDraft,
} from "./template";

export type ProgressCheckStatus = "done" | "pending";

export type ProgressCheck = {
  key: "time" | "accumulated" | "attendances" | "performance" | "physical" | `course:${string}` | `requirement:${string}`;
  label: string;
  status: ProgressCheckStatus;
  /** Texto curto do estado atual (ex.: "2 de 3 meses"). */
  detail: string;
  /** 0–1 para a barra de progresso, quando faz sentido. */
  progress?: number;
  /** Link para resolver o requisito (ex.: curso na biblioteca). */
  href?: string;
};

export type StudentProgressInput = {
  grades: GraduationGradeDraft[];
  monthlyMinAttendances: number;
  /** Índice do grau atual no template (-1 = sem graduação). */
  currentGradeIndex: number;
  /** Data da última graduação (null = sem graduação). */
  lastAwardedAt: Date | null;
  /** Datas das presenças confirmadas na modalidade (todas). */
  attendanceDates: Date[];
  /** Média 1–10 das últimas avaliações de performance na modalidade (null = sem avaliações). */
  performanceAvg: number | null;
  performanceEvaluationCount: number;
  /** Data da última avaliação física submetida (null = nenhuma). */
  lastPhysicalAssessmentAt: Date | null;
  completedCourseIds: Set<string>;
  courseNames: Map<string, string>;
  fulfilledRequirementIds: Set<string>;
  now: Date;
};

export type CumulativeGradeItems = {
  gradeId: string;
  gradeName: string;
  colors: string[];
  items: GraduationItemDraft[];
};

export type StudentProgress = {
  current: GraduationGradeDraft | null;
  next: GraduationGradeDraft | null;
  /** Requisitos obrigatórios para o exame do próximo grau. */
  checks: ProgressCheck[];
  /** Cursos recomendados (não bloqueiam). */
  recommendedCourses: { courseId: string; name: string; completed: boolean }[];
  doneCount: number;
  isReadyForExam: boolean;
  qualifyingMonthsTotal: number;
  qualifyingMonthsSinceLastGrade: number;
  /** Itens novos do próximo grau. */
  newItems: GraduationItemDraft[];
  /** Graus anteriores ao próximo (revisão), do mais recente para o mais antigo. */
  reviewGrades: CumulativeGradeItems[];
};

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Número de meses (calendário) com pelo menos `minPerMonth` presenças. */
export function countQualifyingMonths(dates: Date[], minPerMonth: number, since: Date | null = null): number {
  const perMonth = new Map<string, number>();
  for (const d of dates) {
    if (since && d < since) continue;
    const k = monthKey(d);
    perMonth.set(k, (perMonth.get(k) ?? 0) + 1);
  }
  let count = 0;
  for (const n of perMonth.values()) if (n >= Math.max(1, minPerMonth)) count++;
  return count;
}

function monthsAgo(now: Date, months: number): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function computeStudentProgress(input: StudentProgressInput): StudentProgress {
  const { grades, currentGradeIndex } = input;
  const current = currentGradeIndex >= 0 ? grades[currentGradeIndex] ?? null : null;
  const nextIndex = currentGradeIndex + 1;
  const next = grades[nextIndex] ?? null;

  const qualifyingMonthsTotal = countQualifyingMonths(input.attendanceDates, input.monthlyMinAttendances);
  const qualifyingMonthsSinceLastGrade = countQualifyingMonths(
    input.attendanceDates,
    input.monthlyMinAttendances,
    input.lastAwardedAt
  );

  if (!next) {
    return {
      current,
      next: null,
      checks: [],
      recommendedCourses: [],
      doneCount: 0,
      isReadyForExam: false,
      qualifyingMonthsTotal,
      qualifyingMonthsSinceLastGrade,
      newItems: [],
      reviewGrades: [],
    };
  }

  const checks: ProgressCheck[] = [];
  const monthsWord = (n: number) => plural(n, "mês", "meses");

  if (next.minMonths > 0) {
    const have = qualifyingMonthsSinceLastGrade;
    checks.push({
      key: "time",
      label: current ? `${monthsWord(next.minMonths)} de treino desde ${current.name}` : `${monthsWord(next.minMonths)} de treino`,
      status: have >= next.minMonths ? "done" : "pending",
      detail: `${Math.min(have, next.minMonths)} de ${monthsWord(next.minMonths)}`,
      progress: Math.min(1, have / next.minMonths),
    });
  }

  const accumulatedTarget = accumulatedMonths(grades)[nextIndex] ?? 0;
  // Sem graduação, o acumulado coincide com o tempo mínimo — evita uma linha repetida.
  if (current && accumulatedTarget > next.minMonths) {
    const have = qualifyingMonthsTotal;
    checks.push({
      key: "accumulated",
      label: `${monthsWord(accumulatedTarget)} de treino acumulado na modalidade`,
      status: have >= accumulatedTarget ? "done" : "pending",
      detail: `${Math.min(have, accumulatedTarget)} de ${monthsWord(accumulatedTarget)}`,
      progress: Math.min(1, have / accumulatedTarget),
    });
  }

  if (next.minAttendances != null && next.minAttendances > 0) {
    const have = input.attendanceDates.filter((d) => !input.lastAwardedAt || d >= input.lastAwardedAt).length;
    checks.push({
      key: "attendances",
      label: current ? `${plural(next.minAttendances, "treino", "treinos")} desde ${current.name}` : plural(next.minAttendances, "treino", "treinos"),
      status: have >= next.minAttendances ? "done" : "pending",
      detail: `${Math.min(have, next.minAttendances)} de ${next.minAttendances}`,
      progress: Math.min(1, have / next.minAttendances),
    });
  }

  if (next.minPerformanceAvg != null) {
    const avg = input.performanceAvg;
    checks.push({
      key: "performance",
      label: `Média de performance de ${formatScore(next.minPerformanceAvg)} ou mais`,
      status: avg != null && avg >= next.minPerformanceAvg ? "done" : "pending",
      detail:
        avg == null
          ? "Ainda sem avaliações nesta modalidade"
          : `Atual: ${formatScore(avg)} / 10 (${plural(input.performanceEvaluationCount, "avaliação", "avaliações")})`,
      progress: avg == null ? 0 : Math.min(1, avg / next.minPerformanceAvg),
    });
  }

  if (next.physicalAssessmentMaxAgeMonths != null) {
    const limit = monthsAgo(input.now, next.physicalAssessmentMaxAgeMonths);
    const last = input.lastPhysicalAssessmentAt;
    const ok = last != null && last >= limit;
    checks.push({
      key: "physical",
      label: `Avaliação física nos últimos ${monthsWord(next.physicalAssessmentMaxAgeMonths)}`,
      status: ok ? "done" : "pending",
      detail: last ? `Última: ${formatDatePt(last)}${ok ? "" : " — fora do prazo"}` : "Ainda sem avaliação física",
      href: ok ? undefined : "/dashboard/ficha-fisica",
    });
  }

  for (const c of next.courses.filter((c) => c.isRequired)) {
    const done = input.completedCourseIds.has(c.courseId);
    checks.push({
      key: `course:${c.courseId}`,
      label: `Curso: ${input.courseNames.get(c.courseId) ?? "Curso"}`,
      status: done ? "done" : "pending",
      detail: done ? "Concluído" : "Por concluir",
      href: `/dashboard/biblioteca/${c.courseId}`,
    });
  }

  for (const r of next.requirements) {
    const done = input.fulfilledRequirementIds.has(r.id);
    checks.push({
      key: `requirement:${r.id}`,
      label: r.label,
      status: done ? "done" : "pending",
      detail: done ? "Validado pela academia" : "A validar pela academia",
    });
  }

  const doneCount = checks.filter((c) => c.status === "done").length;

  const reviewGrades: CumulativeGradeItems[] = grades
    .slice(0, nextIndex)
    .map((g) => ({ gradeId: g.id, gradeName: g.name, colors: g.colors, items: g.items }))
    .reverse();

  return {
    current,
    next,
    checks,
    recommendedCourses: next.courses
      .filter((c) => !c.isRequired)
      .map((c) => ({
        courseId: c.courseId,
        name: input.courseNames.get(c.courseId) ?? "Curso",
        completed: input.completedCourseIds.has(c.courseId),
      })),
    doneCount,
    isReadyForExam: doneCount === checks.length,
    qualifyingMonthsTotal,
    qualifyingMonthsSinceLastGrade,
    newItems: next.items,
    reviewGrades,
  };
}

/** Itens agrupados por eixo, na ordem dos eixos. */
export function groupItemsByAxis(items: GraduationItemDraft[]): { axis: GraduationAxis; items: GraduationItemDraft[] }[] {
  return GRADUATION_AXES.map((axis) => ({ axis, items: items.filter((i) => i.axis === axis) })).filter((g) => g.items.length > 0);
}

/** Média simples (1–10) de todas as notas numéricas das avaliações (critério a critério). */
export function averageEvaluationScores(evaluations: { scores: Record<string, unknown> | null }[]): number | null {
  const values: number[] = [];
  for (const ev of evaluations) {
    for (const v of Object.values(ev.scores ?? {})) {
      if (typeof v === "number" && v >= 1 && v <= 10) values.push(v);
    }
  }
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

function formatDatePt(d: Date): string {
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
