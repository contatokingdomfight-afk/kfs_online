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
import { TribePhotoMarquee } from "@/components/home/TribePhotoMarquee";
import { WhyChoose } from "@/components/home/WhyChoose";
import { Testimonials } from "@/components/home/Testimonials";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/home/Footer";
import { HomeHeader } from "@/components/home/HomeHeader";
import { loadPublicWeeklySchedule } from "@/lib/public-weekly-schedule";
import { loadPublicPlans } from "@/lib/public-plans";
import { loadPublicTribePhotos } from "@/lib/public-tribe-photos";
import { LocalBusinessJsonLd } from "@/components/seo/LocalBusinessJsonLd";

/** Conteúdo da página inicial pública. Usado por «/» (PT) e «/en» (EN), ambas estáticas. */
export async function HomePageView({ locale }: { locale: "pt" | "en" }) {
  const content = getHomeContent(locale);
  const [weeklySchedule, publicPlans, tribePhotos] = await Promise.all([
    loadPublicWeeklySchedule(),
    loadPublicPlans(),
    loadPublicTribePhotos(),
  ]);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LocalBusinessJsonLd />
      <HomeHeader
        ctaLabel={content.headerCta}
        modalidadesLabel={content.headerModalidades}
        timerLabel={content.headerTimer}
        judgingLabel={content.headerJudging}
        signInLabel={content.headerSignIn}
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
      <TribePhotoMarquee
        content={{ tribeGalleryEyebrow: content.tribeGalleryEyebrow, tribeGalleryTitle: content.tribeGalleryTitle }}
        photos={tribePhotos}
      />
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
      />
      <WeeklyScheduleSection content={content} schedule={weeklySchedule} locale={locale} />
      <YouTubeShortsSection content={content} />
      <WhyChoose content={content} />
      <Testimonials content={content} />
      <FAQSection content={content} />
      <About content={content} />
      <Founders content={content} />
      <LogoSymbolismSection content={content} />
      <ArbitrationSection content={content} />
      <CTASection content={content} />
      <Footer content={content} locale={locale} />
    </main>
  );
}
