/**
 * Query string para `/admin/turmas` e para links de edição que devem preservar
 * vista (semana/modalidade), semana e filtro de escola.
 */
export function buildTurmasListQuery(sp: { [key: string]: string | string[] | undefined }): string {
  const view = typeof sp.view === "string" ? sp.view : "";
  const week = typeof sp.week === "string" ? sp.week : "";
  const school = typeof sp.school === "string" ? sp.school : "";
  const q = new URLSearchParams();
  if (view === "modalidade") q.set("view", "modalidade");
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) q.set("week", week);
  if (school) q.set("school", school);
  return q.toString();
}

export function buildTurmasListQueryFromState(input: {
  view: "semana" | "modalidade";
  weekYmd: string | null;
  schoolId: string | null;
}): string {
  const q = new URLSearchParams();
  if (input.view === "modalidade") q.set("view", "modalidade");
  if (input.weekYmd && /^\d{4}-\d{2}-\d{2}$/.test(input.weekYmd)) q.set("week", input.weekYmd);
  if (input.schoolId) q.set("school", input.schoolId);
  return q.toString();
}

/**
 * Path para `redirect()` após cancelar aula. Só aceita query gerada pelo nosso UI
 * (evita open redirect). Sem query válida → `/admin/turmas`.
 */
export function turmasPathAfterDelete(returnQuery: string | undefined): string {
  if (!returnQuery?.trim()) return "/admin/turmas";
  const raw = returnQuery.trim();
  if (raw.length > 512) return "/admin/turmas";
  if (!/^[\w&=%.+\-]*$/.test(raw)) return "/admin/turmas";
  return `/admin/turmas?${raw}`;
}
