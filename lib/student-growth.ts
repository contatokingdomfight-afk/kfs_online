export type GrowthStudent = {
  createdAt: string;
  status: string;
  statusChangedAt: string | null;
  planId?: string | null;
};

/** Saiu da escola: INATIVO, ou INADIMPLENTE já sem plano (deixou de pagar e perdeu o plano). */
export function isChurnedStudent(s: GrowthStudent): boolean {
  return s.status === "INATIVO" || (s.status === "INADIMPLENTE" && !s.planId);
}

export type GrowthBucketRange = { key: string; start: string; end: string };

/**
 * Crescimento de alunos por intervalo (datas YYYY-MM-DD, inclusivas):
 * - `active`: alunos criados até ao fim do intervalo que ainda não tinham saído (ver `isChurnedStudent`);
 * - `new`: criados dentro do intervalo;
 * - `churned`: saíram dentro do intervalo (data = `statusChangedAt`).
 * Sem `statusChangedAt`, a data de saída não é conhecida e o aluno não sai da linha.
 */
export function computeStudentGrowth(
  students: GrowthStudent[],
  buckets: GrowthBucketRange[]
): { bucket: string; active: number; new: number; churned: number }[] {
  return buckets.map(({ key, start, end }) => {
    let active = 0;
    let fresh = 0;
    let churned = 0;
    for (const s of students) {
      const created = s.createdAt ? String(s.createdAt).slice(0, 10) : "";
      if (!created || created > end) continue;
      const leftAt = isChurnedStudent(s) && s.statusChangedAt ? String(s.statusChangedAt).slice(0, 10) : null;
      if (created >= start) fresh++;
      if (leftAt && leftAt >= start && leftAt <= end) churned++;
      if (!leftAt || leftAt > end) active++;
    }
    return { bucket: key, active, new: fresh, churned };
  });
}
