/**
 * Que graduações (modalidades com template publicado) um aluno vê, e por que ordem.
 *
 * - Modalidades a que está ligado: principal, com presenças confirmadas ou com grau atribuído.
 * - Modalidades compostas (ex.: MMA) contam através das modalidades base configuradas no admin.
 * - Plano com todas as modalidades: todas as graduações publicadas.
 * - Sem nenhuma ligação: todas as publicadas (para conhecer a jornada).
 * Ordem: principal (ou as suas modalidades base) → com grau → com presenças → restantes, por nome.
 */
export type GraduationModalityInput = {
  published: string[];
  primary: string | null;
  attended: string[];
  graded: string[];
  planScope: string | null;
  /** Modalidade composta → modalidades base (ModalityRef.graduationModalities). */
  components: Record<string, string[]>;
  names: Record<string, string>;
};

export function selectGraduationModalities(input: GraduationModalityInput): string[] {
  const published = new Set(input.published);
  const expand = (codes: (string | null)[]) => {
    const out = new Set<string>();
    for (const c of codes) {
      if (!c) continue;
      out.add(c);
      for (const base of input.components[c] ?? []) out.add(base);
    }
    return out;
  };

  const linked = expand([input.primary, ...input.attended, ...input.graded]);
  const primarySet = expand([input.primary]);
  const gradedSet = new Set(input.graded);
  const attendedSet = expand(input.attended);

  let chosen = [...linked].filter((c) => published.has(c));
  if (input.planScope === "ALL" || (chosen.length === 0 && linked.size === 0)) {
    chosen = [...published];
  }

  const rank = (c: string) => (primarySet.has(c) ? 0 : gradedSet.has(c) ? 1 : attendedSet.has(c) ? 2 : 3);
  return [...new Set(chosen)].sort(
    (a, b) => rank(a) - rank(b) || (input.names[a] ?? a).localeCompare(input.names[b] ?? b, "pt")
  );
}
