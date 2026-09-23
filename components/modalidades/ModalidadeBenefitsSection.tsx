import type { LucideIcon } from "lucide-react";

type Benefit = { icon: LucideIcon; title: string; desc: string };

type Props = {
  title: string;
  benefits: readonly Benefit[];
};

export function ModalidadeBenefitsSection({ title, benefits }: Props) {
  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{title}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 transition-all hover:border-[var(--primary)]/30"
            >
              <b.icon className="w-6 h-6 shrink-0 text-[var(--primary)]" aria-hidden />
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{b.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
