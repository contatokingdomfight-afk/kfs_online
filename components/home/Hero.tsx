import Link from "next/link";

type Content = {
  heroHeadline1: string;
  heroHeadline2: string;
  heroSubheadline: string;
  ctaStart: string;
  ctaViewTrainings: string;
};

export function Hero({ content }: { content: Content }) {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      {/* Background gradient */}
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(193, 18, 31, 0.25), transparent)",
        }}
      />
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="animate-fade-in text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl lg:text-6xl">
          <span className="block">{content.heroHeadline1}</span>
          <span className="block">{content.heroHeadline2}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg md:text-xl">
          {content.heroSubheadline}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/aula-experimental"
            className="btn btn-primary w-full min-w-[200px] min-h-[48px] px-8 py-3 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
          >
            {content.ctaStart}
          </Link>
          <Link
            href="/sign-in"
            className="btn btn-secondary w-full min-w-[200px] min-h-[48px] px-8 py-3 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
          >
            {content.ctaViewTrainings}
          </Link>
        </div>
      </div>
    </section>
  );
}
