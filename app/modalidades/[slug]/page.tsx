import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import {
  MODALIDADES_ORDER,
  getModalidadeContent,
  isModalidadeSlug,
} from "@/lib/modalidades-content";
import { ModalidadesHeader } from "@/components/modalidades/ModalidadesHeader";
import { ModalidadeHero } from "@/components/modalidades/ModalidadeHero";
import { ModalidadeProseSection } from "@/components/modalidades/ModalidadeProseSection";
import { ModalidadeBenefitsSection } from "@/components/modalidades/ModalidadeBenefitsSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return MODALIDADES_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  if (!isModalidadeSlug(slug)) return {};
  const locale = (await getLocaleFromCookies()) === "en" ? "en" : "pt";
  const content = getModalidadeContent(locale, slug);
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    keywords: content.metaKeywords,
    alternates: { canonical: `/modalidades/${slug}` },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
      type: "website",
    },
  };
}

export default async function ModalidadePage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!isModalidadeSlug(slug)) notFound();

  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as "pt" | "en";
  const content = getModalidadeContent(locale, slug);
  const hubLabel = locale === "en" ? "Programs" : "Modalidades";

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <ModalidadesHeader hubLabel={hubLabel} breadcrumbLabel={content.name} />

      <ModalidadeHero
        icon={content.icon}
        title={content.heroTitle}
        subtitle={content.heroSubtitle}
        ctaLabel={content.ctaButton}
      />

      <ModalidadeProseSection title={content.introTitle} text={content.introText} />

      <ModalidadeBenefitsSection title={content.benefitsTitle} benefits={content.benefits} />

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
