type Content = {
  aboutTitle: string;
  missionTitle: string;
  missionText: string;
  visionTitle: string;
  visionText: string;
  purposeTitle: string;
  purposeText: string;
};

const blocks = [
  (c: Content) => ({ title: c.missionTitle, text: c.missionText }),
  (c: Content) => ({ title: c.visionTitle, text: c.visionText }),
  (c: Content) => ({ title: c.purposeTitle, text: c.purposeText }),
];

export function About({ content }: { content: Content }) {
  return (
    <section id="sobre" className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.aboutTitle}
        </h2>
        <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-3">
          {blocks.map((fn, i) => {
            const { title, text } = fn(content);
            return (
              <div
                key={i}
                className="animate-fade-in rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-all hover:border-[var(--primary)]/30"
              >
                <h3 className="text-base font-semibold text-[var(--primary)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
