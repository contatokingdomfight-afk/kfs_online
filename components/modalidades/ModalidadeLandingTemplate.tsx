import type { Metadata } from "next";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getModalidadeContent, type ModalidadeSlug } from "@/lib/modalidades-content";
import { getHomeContent } from "@/lib/home-content";
import { loadPublicWeeklySchedule, filterScheduleByModality } from "@/lib/public-weekly-schedule";
import { loadPublicPlans } from "@/lib/public-plans";
import { ModalidadesHeader } from "@/components/modalidades/ModalidadesHeader";
import { ModalidadeHero } from "@/components/modalidades/ModalidadeHero";
import { ModalidadeProseSection } from "@/components/modalidades/ModalidadeProseSection";
import { ModalidadeBenefitsSection } from "@/components/modalidades/ModalidadeBenefitsSection";
import { ModalidadeLocationSection } from "@/components/modalidades/ModalidadeLocationSection";
import { ModalidadeTeamNote } from "@/components/modalidades/ModalidadeTeamNote";
import { WeeklyScheduleSection } from "@/components/home/WeeklyScheduleSection";
import { Plans } from "@/components/home/Plans";
import { Founders } from "@/components/home/Founders";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { LocalBusinessJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import { ModalidadeJsonLd } from "@/components/seo/ModalidadeJsonLd";

export async function generateModalidadeLandingMetadata(slug: ModalidadeSlug): Promise<Metadata> {
  const locale = (await getLocaleFromCookies()) === "en" ? "en" : "pt";
  const content = getModalidadeContent(locale, slug);
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    keywords: content.metaKeywords,
    alternates: { canonical: content.path },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
      type: "website",
      url: content.path,
    },
    twitter: {
      card: "summary_large_image",
      title: content.metaTitle,
      description: content.metaDescription,
    },
  };
}

export async function ModalidadeLandingTemplate({ slug }: { slug: ModalidadeSlug }) {
  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as "pt" | "en";
  const content = getModalidadeContent(locale, slug);
  const home = getHomeContent(locale);
  const hubLabel = locale === "en" ? "Programs" : "Modalidades";

  const [weeklySchedule, publicPlans] = await Promise.all([loadPublicWeeklySchedule(), loadPublicPlans()]);
  const filteredSchedule = filterScheduleByModality(weeklySchedule, content.scheduleModalityCodes);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LocalBusinessJsonLd />
      <ModalidadeJsonLd content={content} />

      <ModalidadesHeader hubLabel={hubLabel} breadcrumbLabel={content.name} locale={locale} />

      <ModalidadeHero
        icon={content.icon}
        title={content.heroTitle}
        subtitle={content.heroSubtitle}
        ctaLabel={content.ctaButton}
      />

      <ModalidadeProseSection title={content.introTitle} text={content.introText} />

      <ModalidadeBenefitsSection title={content.benefitsTitle} benefits={content.benefits} />

      <WeeklyScheduleSection
        content={{
          scheduleTitle: home.scheduleTitle,
          scheduleEmptyDay: home.scheduleEmptyDay,
          scheduleCta: home.scheduleCta,
          scheduleFootnote: home.scheduleFootnote,
          scheduleNoClasses: home.scheduleNoClasses,
        }}
        schedule={filteredSchedule}
        locale={locale}
      />

      <Plans
        plans={publicPlans}
        plansTitle={home.plansTitle}
        planPer={home.planPer}
        planCta={home.planCta}
        popular={home.popular}
        noPlans={home.plansEmpty}
        locale={locale}
        planPriceOnRequest={home.planPriceOnRequest}
        planCtaOnRequest={home.planCtaOnRequest}
        familyPlanHighlight={home.familyPlanHighlight}
        familyPlanNote={home.familyPlanNote}
      />

      <ModalidadeLocationSection title={home.modalidadeLocationTitle} directionsLabel={home.footerDirections} />

      {content.showFounders ? (
        <Founders content={home} />
      ) : content.teamNote ? (
        <ModalidadeTeamNote text={content.teamNote} />
      ) : null}

      <ModalidadeProseSection title={content.forWhomTitle} text={content.forWhomText} />

      <FAQSection content={{ faqTitle: content.faqTitle, faqItems: content.faqItems }} />

      <CTASection
        content={{
          ctaHeadline: content.ctaHeadline,
          ctaSub: content.ctaSub,
          ctaButton: content.ctaButton,
        }}
      />

      <PublicSiteFooter />
    </main>
  );
}
