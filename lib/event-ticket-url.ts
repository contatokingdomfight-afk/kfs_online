/**
 * URL absoluta no QR do ingresso (admin valida em /admin/eventos/ingresso).
 * No cliente usa window.location.origin; no servidor requer NEXT_PUBLIC_APP_URL.
 */
export function buildEventTicketCheckinUrl(origin: string, checkinToken: string): string {
  const base = origin.replace(/\/$/, "");
  const q = new URLSearchParams({ token: checkinToken });
  return `${base}/admin/eventos/ingresso?${q.toString()}`;
}
