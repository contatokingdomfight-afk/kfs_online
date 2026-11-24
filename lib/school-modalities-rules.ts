/** Regras puras das modalidades por escola (testáveis; sem Supabase). Ver lib/school-modalities.ts. */

export type ModalityRefRow = { code: string; name: string; schoolId: string | null };
export type ModalityOffering = { refs: ModalityRefRow[]; disabledCodes: Set<string> };

/**
 * Modalidades oferecidas por uma escola: as da rede que não desligou + as próprias.
 * schoolId null → só as da rede (vista da rede / sem escola).
 */
export function offeredModalities(o: ModalityOffering, schoolId: string | null): ModalityRefRow[] {
  return o.refs.filter((r) => (r.schoolId == null ? !(schoolId && o.disabledCodes.has(r.code)) : r.schoolId === schoolId));
}

/** Modalidades visíveis num conjunto de escolas (ex.: diretor com 2 escolas): rede + próprias dessas escolas. */
export function modalitiesForSchools<R extends ModalityRefRow>(refs: R[], schoolIds: string[] | null): R[] {
  if (schoolIds == null) return refs;
  const ok = new Set(schoolIds);
  return refs.filter((r) => r.schoolId == null || ok.has(r.schoolId));
}

/** Modalidade própria de uma escola → fica fora do ranking global (decisão 2026-11-24). */
export function isSchoolOwnModality(refs: ModalityRefRow[], code: string): boolean {
  return refs.some((r) => r.code === code && r.schoolId != null);
}

/** Código interno para uma modalidade criada por uma escola (único na rede). */
export function schoolModalityCode(name: string, schoolSlugOrId: string): string {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  return `${clean(schoolSlugOrId).slice(0, 20)}__${clean(name).slice(0, 30)}`;
}
