import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getHomeContent } from "@/lib/home-content";
import { Hero } from "@/components/home/Hero";
import { HomePwaInstallBand } from "@/components/home/HomePwaInstallBand";
import { Stats } from "@/components/home/Stats";
import { About } from "@/components/home/About";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ArbitrationSection } from "@/components/home/ArbitrationSection";
import { Plans } from "@/components/home/Plans";
import { Founders } from "@/components/home/Founders";
import { YouTubeShortsSection } from "@/components/home/YouTubeShortsSection";
import { LogoSymbolismSection } from "@/components/home/LogoSymbolismSection";
import { WeeklyScheduleSection } from "@/components/home/WeeklyScheduleSection";
import { WhyChoose } from "@/components/home/WhyChoose";
import { Testimonials } from "@/components/home/Testimonials";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/home/Footer";
import { HomeHeader } from "@/components/home/HomeHeader";
import { loadPublicWeeklySchedule } from "@/lib/public-weekly-schedule";
import { loadPublicPlans } from "@/lib/public-plans";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function firstSearchParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === "string" ? v : v[0];
}

export const metadata: Metadata = {
  title: "Kingdom Fight School | Treine com Propósito. Lute com Disciplina.",
  description:
    "Escola de artes marciais com base em valores cristãos. Muay Thai, Boxe, Kickboxing. Metodologia estruturada, treinadores experientes. Oeiras e Cascais.",
  keywords: [
    "artes marciais",
    "Muay Thai",
    "Boxe",
    "Kickboxing",
    "Kingdom Fight",
    "Oeiras",
    "Cascais",
    "escola de luta",
  ],
  openGraph: {
    title: "Kingdom Fight School | Treine com Propósito. Lute com Disciplina.",
    description:
      "Escola de artes marciais com base em valores cristãos. Metodologia estruturada, treinadores experientes.",
    type: "website",
  },
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const code = firstSearchParam(params.code);
  const nextRaw = firstSearchParam(params.next);
  if (code) {
    const next = nextRaw ? `&next=${encodeURIComponent(nextRaw)}` : "";
    redirect(`/auth/callback?code=${encodeURIComponent(code)}${next}`);
  }

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const content = getHomeContent(locale);
  const [weeklySchedule, publicPlans] = await Promise.all([loadPublicWeeklySchedule(), loadPublicPlans()]);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <HomeHeader
        ctaLabel={content.headerCta}
        timerLabel={content.headerTimer}
        judgingLabel={content.headerJudging}
        navHowItWorksLabel={content.navHowItWorks}
        navPlansLabel={content.navPlans}
        navScheduleLabel={content.navSchedule}
        navFaqLabel={content.navFaq}
        navAboutLabel={content.navAbout}
        navMenuLabel={content.navMenuLabel}
        navMenuCloseLabel={content.navMenuClose}
        navAriaLabel={content.navAriaLabel}
      />

      <Hero content={content} />
      <HomePwaInstallBand locale={locale} title={content.pwaBandTitle} subtitle={content.pwaBandSub} />
      <Stats content={content} />
      <HowItWorks content={content} />
      <Plans
        plans={publicPlans}
        plansTitle={content.plansTitle}
        planPer={content.planPer}
        planCta={content.planCta}
        popular={content.popular}
        noPlans={content.plansEmpty}
        locale={locale}
        planPriceOnRequest={content.planPriceOnRequest}
        planCtaOnRequest={content.planCtaOnRequest}
        familyPlanHighlight={content.familyPlanHighlight}
        familyPlanNote={content.familyPlanNote}
        plansDigitalNote={content.plansDigitalNote}
      />
      <WeeklyScheduleSection content={content} schedule={weeklySchedule} locale={locale} />
      <WhyChoose content={content} />
      <Testimonials content={content} />
      <FAQSection content={content} />
      <About content={content} />
      <Founders content={content} />
      <YouTubeShortsSection content={content} />
      <LogoSymbolismSection content={content} />
      <ArbitrationSection content={content} />
      <CTASection content={content} />
      <Footer content={content} />
    </main>
  );
}
