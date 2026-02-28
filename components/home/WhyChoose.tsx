type Content = {
  whyTitle: string;
  why1: string;
  why1Desc: string;
  why2: string;
  why2Desc: string;
  why4: string;
  why4Desc: string;
  why5: string;
  why5Desc: string;
};

const items = [
  (c: Content) => ({ title: c.why1, desc: c.why1Desc, icon: "🥋" }),
  (c: Content) => ({ title: c.why2, desc: c.why2Desc, icon: "📋" }),
  (c: Content) => ({ title: c.why4, desc: c.why4Desc, icon: "🤝" }),
  (c: Content) => ({ title: c.why5, desc: c.why5Desc, icon: "📈" }),
];

export function WhyChoose({ content }: { content: Content }) {
  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.whyTitle}
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {items.map((fn, i) => {
            const { title, desc, icon } = fn(content);
            return (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 transition-all hover:border-[var(--primary)]/30"
              >
                <span className="text-2xl">{icon}</span>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
