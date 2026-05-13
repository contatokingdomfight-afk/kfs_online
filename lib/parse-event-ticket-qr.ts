const TOKEN_RE = /^[a-f0-9]{48}$/i;

export type ParsedTicketQr =
  | { ok: true; token: string; targetEventId: string }
  | { ok: false };

/**
 * Aceita o token em hex (48 chars) ou o URL completo do QR do ingresso.
 */
export function parseEventTicketQrPayload(raw: string, currentEventId: string): ParsedTicketQr {
  const trimmed = raw.trim();
  if (TOKEN_RE.test(trimmed)) {
    return { ok: true, token: trimmed.toLowerCase(), targetEventId: currentEventId };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false };
  }
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!TOKEN_RE.test(token)) return { ok: false };
  const m = url.pathname.match(/\/admin\/eventos\/([^/]+)\/validar\/?$/i);
  if (m?.[1]) {
    try {
      return { ok: true, token: token.toLowerCase(), targetEventId: decodeURIComponent(m[1]) };
    } catch {
      return { ok: true, token: token.toLowerCase(), targetEventId: m[1] };
    }
  }
  return { ok: true, token: token.toLowerCase(), targetEventId: currentEventId };
}
