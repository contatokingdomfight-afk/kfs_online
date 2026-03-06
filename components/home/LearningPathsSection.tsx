import Link from "next/link";

type Content = {
  learningPathsTitle: string;
  learningPathsSubtitle: string;
  learningPathsDesc: string;
  learningPathsCta: string;
};

export function LearningPathsSection({ content }: { content: Content }) {
  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border-l-4 border-[var(--primary)] p-8 sm:p-10"
          style={{
            background: "linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)",
          }}
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            {content.learningPathsTitle}
          </h2>
          <p className="mt-2 text-lg font-semibold text-[var(--primary)]">
            {content.learningPathsSubtitle}
          </p>
          <p className="mt-4 text-[var(--text-secondary)] leading-relaxed">
            {content.learningPathsDesc}
          </p>
          <Link
            href="/#plans"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--primary)] px-6 py-3 font-medium text-white no-underline transition-opacity hover:opacity-95"
          >
            {content.learningPathsCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
