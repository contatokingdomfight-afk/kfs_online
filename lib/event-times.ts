/** Normaliza input de <input type="time"> ou TIME da BD para "HH:MM:SS" (Postgres). */
export function normalizeTimeForDb(input: string | null | undefined): string | null {
  const raw = input?.trim() ?? "";
  if (!raw) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  const sec = m[3] != null ? Math.min(59, Math.max(0, parseInt(m[3], 10))) : 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Valor para atributo default de <input type="time" /> a partir da BD. */
export function timeInputValueFromDb(db: string | null | undefined): string {
  if (!db?.trim()) return "";
  const t = db.trim();
  return t.length >= 5 ? t.slice(0, 5) : t;
}
