import type { Metadata } from "next";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { RoundTimerClient } from "@/components/coach/round-timer/RoundTimerClient";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Free Boxing & Muay Thai Round Timer | Kingdom Fight School",
  description:
    "Free online round timer for boxing, Muay Thai, kickboxing and HIIT. Custom rounds, rest and warning sounds. Works on phone and desktop, no sign-up.",
  keywords: [
    "boxing timer",
    "round timer",
    "muay thai timer",
    "interval timer",
    "kickboxing timer",
    "free boxing round timer",
    "HIIT timer",
  ],
  alternates: { canonical: "/timer" },
  openGraph: {
    title: "Free Boxing & Muay Thai Round Timer",
    description:
      "Custom rounds, rest and warning sounds. Works on phone and desktop, no sign-up. By Kingdom Fight School.",
    type: "website",
  },
};

export default async function PublicTimerPage() {
  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as Locale;
  return (
    <main
      className="min-h-screen bg-[var(--bg)] px-3 py-8 sm:py-12"
      style={{ paddingTop: "clamp(24px, 6vw, 48px)" }}
    >
      <RoundTimerClient locale={locale} variant="public" />
    </main>
  );
}
