/**
 * Query string para `/admin/turmas` e para links de edição que devem preservar
 * vista (semana/modalidade), semana e filtro de escola.
 */
export function buildTurmasListQuery(sp: { [key: string]: string | string[] | undefined }): string {
  const view = typeof sp.view === "string" ? sp.view : "";
  const week = typeof sp.week === "string" ? sp.week : "";
  const school = typeof sp.school === "string" ? sp.school : "";
  const occurrence = typeof sp.occurrence === "string" ? sp.occurrence : "";
  const q = new URLSearchParams();
  if (view === "modalidade") q.set("view", "modalidade");
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) q.set("week", week);
  if (school) q.set("school", school);
  if (occurrence && /^\d{4}-\d{2}-\d{2}$/.test(occurrence)) q.set("occurrence", occurrence);
  return q.toString();
}

export function buildTurmasListQueryFromState(input: {
  view: "semana" | "modalidade";
  weekYmd: string | null;
  schoolId: string | null;
  /** Data concreta da ocorrência (recorrentes), para edição/cancelamento. */
  occurrenceYmd?: string | null;
}): string {
  const q = new URLSearchParams();
  if (input.view === "modalidade") q.set("view", "modalidade");
  if (input.weekYmd && /^\d{4}-\d{2}-\d{2}$/.test(input.weekYmd)) q.set("week", input.weekYmd);
  if (input.schoolId) q.set("school", input.schoolId);
  if (input.occurrenceYmd && /^\d{4}-\d{2}-\d{2}$/.test(input.occurrenceYmd)) {
    q.set("occurrence", input.occurrenceYmd);
  }
  return q.toString();
}

/**
 * Path interno após cancelar aula (cliente faz `location.assign`).
 * Reconstrói só os parâmetros que o nosso UI usa (evita open redirect e regex frágil).
 */
export function turmasPathAfterDelete(returnQuery: string | undefined): string {
  if (!returnQuery?.trim()) return "/admin/turmas";
  const raw = returnQuery.trim();
  if (raw.length > 512) return "/admin/turmas";
  try {
    const p = new URLSearchParams(raw);
    const out = new URLSearchParams();
    if (p.get("view") === "modalidade") out.set("view", "modalidade");
    const week = p.get("week");
    if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) out.set("week", week);
    const school = p.get("school");
    if (school && /^[a-zA-Z0-9_-]+$/.test(school)) out.set("school", school);
    const s = out.toString();
    return s ? `/admin/turmas?${s}` : "/admin/turmas";
  } catch {
    return "/admin/turmas";
  }
}
