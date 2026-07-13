import Link from "next/link";

type Content = {
  arbitrationTitle: string;
  arbitrationSubtitle: string;
  arbitrationDesc: string;
  arbitrationFeature1: string;
  arbitrationFeature1Desc: string;
  arbitrationFeature2: string;
  arbitrationFeature2Desc: string;
  arbitrationFeature3: string;
  arbitrationFeature3Desc: string;
  arbitrationCtaFree: string;
  arbitrationCtaPlatform: string;
};

const features = [
  (c: Content) => ({ title: c.arbitrationFeature1, desc: c.arbitrationFeature1Desc, icon: "🆓" }),
  (c: Content) => ({ title: c.arbitrationFeature2, desc: c.arbitrationFeature2Desc, icon: "📋" }),
  (c: Content) => ({ title: c.arbitrationFeature3, desc: c.arbitrationFeature3Desc, icon: "🏆" }),
];

export function ArbitrationSection({ content }: { content: Content }) {
  return (
    <section className="border-t border-[var(--border)] bg-[var(--bg-secondary)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            {content.arbitrationSubtitle}
          </p>
          <h2 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            {content.arbitrationTitle}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            {content.arbitrationDesc}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {features.map((fn, i) => {
            const { title, desc, icon } = fn(content);
            return (
              <div
                key={i}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 text-center shadow-sm"
              >
                <div className="text-3xl" aria-hidden>
                  {icon}
                </div>
                <h3 className="mt-4 font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/arbitragem" className="btn btn-primary px-6 py-3 text-sm font-semibold">
            {content.arbitrationCtaFree}
          </Link>
          <Link
            href="/sign-in"
            className="btn btn-ghost border border-[var(--border)] px-6 py-3 text-sm font-semibold"
          >
            {content.arbitrationCtaPlatform}
          </Link>
        </div>
      </div>
    </section>
  );
}
