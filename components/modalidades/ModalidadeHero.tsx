import Link from "next/link";

type Props = {
  icon: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
};

export function ModalidadeHero({ icon, title, subtitle, ctaLabel }: Props) {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(193, 18, 31, 0.25), transparent)",
        }}
      />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <span className="text-5xl" aria-hidden>
          {icon}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg">{subtitle}</p>
        <div className="mt-8">
          <Link
            href="/aula-experimental"
            className="btn btn-primary inline-flex min-h-[48px] min-w-[200px] items-center justify-center px-8 py-3 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
