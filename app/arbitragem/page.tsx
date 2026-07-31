import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { PublicJudgingClient } from "@/components/arbitration/PublicJudgingClient";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Arbitragem Grátis | Boxe e Muay Thai | Kingdom Fight School",
  description:
    "Ferramenta gratuita de arbitragem 10-Point Must para boxe e Muay Thai. Um juiz, critérios por round, sem registo. Ideal para treinos e eventos informais.",
  keywords: [
    "arbitragem boxe",
    "arbitragem muay thai",
    "10 point must",
    "scorecard boxing",
    "arbitragem combate",
    "julgamento combate grátis",
  ],
  alternates: { canonical: "/arbitragem" },
  openGraph: {
    title: "Arbitragem grátis — Boxe e Muay Thai",
    description: "Arbitragem 10-Point Must no telemóvel, sem registo. Por Kingdom Fight School.",
    type: "website",
  },
};

export default async function PublicArbitragemPage() {
  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as Locale;
  return (
    <main
      className="min-h-screen bg-[var(--bg)] px-3 py-8 sm:py-12"
      style={{ paddingTop: "clamp(24px, 6vw, 48px)" }}
    >
      <PublicJudgingClient locale={locale} />
      <PublicSiteFooter />
    </main>
  );
}
