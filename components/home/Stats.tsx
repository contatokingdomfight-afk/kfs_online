type Content = {
  statsYears: string;
  statsYearsLabel: string;
  statsStudents: string;
  statsStudentsLabel: string;
  statsMethod: string;
  statsMethodLabel: string;
  statsModalities: string;
};

const statCards = [
  (c: Content) => ({ value: c.statsYears, label: c.statsYearsLabel }),
  (c: Content) => ({ value: c.statsStudents, label: c.statsStudentsLabel }),
  (c: Content) => ({ value: c.statsMethod, label: c.statsMethodLabel }),
  (c: Content) => ({ value: "", label: c.statsModalities }),
];

export function Stats({ content }: { content: Content }) {
  return (
    <section className="border-t border-[var(--border)] py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((fn, i) => {
            const { value, label } = fn(content);
            return (
              <div
                key={i}
                className="group animate-fade-in rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center transition-all hover:border-[var(--primary)]/40 hover:shadow-lg"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {value && (
                  <div className="text-2xl font-bold text-[var(--primary)] sm:text-3xl">
                    {value}
                  </div>
                )}
                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)] sm:text-base">
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
