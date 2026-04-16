import { LISBON_TZ } from "@/lib/lisbon-payment-dates";

/** Data/hora para UI de notificações; sempre Europe/Lisbon para coincidir SSR e cliente (evita hydration #418). */
export function formatNotificationCreatedAt(iso: string, locale: "pt" | "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pt-PT", {
    timeZone: LISBON_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
