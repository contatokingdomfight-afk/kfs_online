/** Erros do PostgREST vêm como objeto `{ message, code, details }`, não como `Error`. */
export function formatErrorForQueryParam(err: unknown, maxLen = 450): string {
  if (err instanceof Error) return truncate(err.message, maxLen);
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const msg = typeof o.message === "string" ? o.message : null;
    const code = typeof o.code === "string" ? o.code : null;
    const details = typeof o.details === "string" ? o.details : null;
    const hint = typeof o.hint === "string" ? o.hint : null;
    if (msg) {
      const parts = [msg, code && `code=${code}`, details && details, hint && `hint=${hint}`].filter(Boolean);
      return truncate(parts.join(" | "), maxLen);
    }
  }
  try {
    return truncate(JSON.stringify(err), maxLen);
  } catch {
    return truncate(String(err), maxLen);
  }
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 3)}...`;
}
