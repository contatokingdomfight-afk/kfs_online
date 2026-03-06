import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getHomeContent } from "@/lib/home-content";
import { Hero } from "@/components/home/Hero";
import { Stats } from "@/components/home/Stats";
import { About } from "@/components/home/About";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Plans } from "@/components/home/Plans";
import { Founders } from "@/components/home/Founders";
import { LearningPathsSection } from "@/components/home/LearningPathsSection";
import { WhyChoose } from "@/components/home/WhyChoose";
import { Testimonials } from "@/components/home/Testimonials";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/home/Footer";
import { HomeHeader } from "@/components/home/HomeHeader";

type Props = { searchParams: Promise<{ code?: string; next?: string }> };

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
  if (params.code) {
    const next = params.next ? `&next=${encodeURIComponent(params.next)}` : "";
    redirect(`/auth/callback?code=${params.code}${next}`);
  }

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const content = getHomeContent(locale);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <HomeHeader ctaLabel={content.headerCta} />

      <Hero content={content} />
      <Stats content={content} />
      <About content={content} />
      <Founders content={content} />
      <HowItWorks content={content} />
      <LearningPathsSection content={content} />
      <Plans content={content} />
      <WhyChoose content={content} />
      <Testimonials content={content} />
      <CTASection content={content} />
      <Footer content={content} />
    </main>
  );
}
