/**
 * URL absoluta no QR do ingresso: validação por evento em /admin/eventos/[eventId]/validar.
 * No cliente usa window.location.origin; em SSR define NEXT_PUBLIC_APP_URL.
 */
export function buildEventTicketCheckinUrl(origin: string, eventId: string, checkinToken: string): string {
  const base = origin.replace(/\/$/, "");
  const q = new URLSearchParams({ token: checkinToken });
  return `${base}/admin/eventos/${encodeURIComponent(eventId)}/validar?${q.toString()}`;
}
