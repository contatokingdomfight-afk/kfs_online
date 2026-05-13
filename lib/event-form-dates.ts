/**
 * Parse and compare event calendar days from form/DB strings.
 * Accepts YYYY-MM-DD or values that start with that prefix (e.g. ISO timestamps from Supabase).
 */

export type ParsedEventDay = { ok: true; iso: string; utcMs: number } | { ok: false };

export function parseEventDay(input: string): ParsedEventDay {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.trim());
  if (!m) return { ok: false };
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const utcMs = Date.UTC(y, mo, d);
  if (Number.isNaN(utcMs)) return { ok: false };
  const u = new Date(utcMs);
  if (u.getUTCFullYear() !== y || u.getUTCMonth() !== mo || u.getUTCDate() !== d) return { ok: false };
  return { ok: true, iso, utcMs };
}

/** Safe default for <input type="date" /> when loading from DB. */
export function toIsoDateOnlyForInput(value: string | null | undefined): string {
  const r = parseEventDay(String(value ?? ""));
  return r.ok ? r.iso : "";
}
