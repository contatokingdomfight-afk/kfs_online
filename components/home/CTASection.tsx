import Link from "next/link";

type Content = {
  ctaHeadline: string;
  ctaSub: string;
  ctaButton: string;
};

export function CTASection({ content }: { content: Content }) {
  return (
    <section className="border-t border-[var(--border)] py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl md:text-4xl">
          {content.ctaHeadline}
        </h2>
        <p className="mt-4 text-[var(--text-secondary)]">{content.ctaSub}</p>
        <Link
          href="/aula-experimental"
          className="btn btn-primary mt-8 inline-flex min-h-[56px] min-w-[240px] items-center justify-center px-10 py-4 text-lg font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
        >
          {content.ctaButton}
        </Link>
      </div>
    </section>
  );
}
