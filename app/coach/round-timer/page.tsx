import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { RoundTimerClient } from "@/components/coach/round-timer/RoundTimerClient";
import type { Locale } from "@/lib/i18n";

export const metadata = {
  title: "Round Timer | Coach",
};

export default async function CoachRoundTimerPage() {
  const locale = (await getLocaleFromCookies()) === "en" ? "en" : "pt";
  return <RoundTimerClient locale={locale as Locale} />;
}
