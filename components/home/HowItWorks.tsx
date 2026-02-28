type Content = {
  howTitle: string;
  step1: string;
  step1Desc: string;
  step2: string;
  step2Desc: string;
  step3: string;
  step3Desc: string;
  step4: string;
  step4Desc: string;
};

const steps = [
  (c: Content) => ({ title: c.step1, desc: c.step1Desc }),
  (c: Content) => ({ title: c.step2, desc: c.step2Desc }),
  (c: Content) => ({ title: c.step3, desc: c.step3Desc }),
  (c: Content) => ({ title: c.step4, desc: c.step4Desc }),
];

export function HowItWorks({ content }: { content: Content }) {
  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.howTitle}
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((fn, i) => {
            const { title, desc } = fn(content);
            return (
              <div
                key={i}
                className="group relative flex flex-col items-center text-center"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--bg)] text-lg font-bold text-[var(--primary)] transition-all group-hover:bg-[var(--primary)] group-hover:text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {desc}
                </p>
                {i < steps.length - 1 && (
                  <div className="absolute -right-4 top-6 hidden h-0.5 w-8 bg-[var(--border)] lg:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
