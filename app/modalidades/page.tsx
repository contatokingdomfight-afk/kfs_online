import type { Metadata } from "next";
import Link from "next/link";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getAllModalidades, getModalidadesHubContent } from "@/lib/modalidades-content";
import { ModalidadesHeader } from "@/components/modalidades/ModalidadesHeader";
import { CTASection } from "@/components/home/CTASection";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocaleFromCookies()) === "en" ? "en" : "pt";
  const content = getModalidadesHubContent(locale);
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    keywords: content.metaKeywords,
    alternates: { canonical: "/modalidades" },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
      type: "website",
    },
  };
}

export default async function ModalidadesHubPage() {
  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as "pt" | "en";
  const content = getModalidadesHubContent(locale);
  const modalidades = getAllModalidades(locale);
  const hubLabel = locale === "en" ? "Programs" : "Modalidades";

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <ModalidadesHeader hubLabel={hubLabel} />

      <section className="py-16 text-center sm:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {content.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--text-secondary)] sm:text-lg">
            {content.heroSubtitle}
          </p>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {modalidades.map((m) => (
            <Link
              key={m.slug}
              href={`/modalidades/${m.slug}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-center transition-all hover:border-[var(--primary)]/40 hover:shadow-lg"
            >
              <span className="text-4xl" aria-hidden>
                {m.icon}
              </span>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{m.name}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{m.tagline}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">
                {content.cardCta}
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

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
