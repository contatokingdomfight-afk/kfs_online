import Link from "next/link";

type Content = {
  plansTitle: string;
  planOnline: string;
  planOnlinePrice: string;
  planOnlinePer: string;
  planOnlineDesc: string;
  planOnlineAudience: string;
  planPresencial1: string;
  planPresencial1Price: string;
  planPresencial1Desc: string;
  planPresencial1Audience: string;
  planPresencial2: string;
  planPresencial2Price: string;
  planPresencial2Desc: string;
  planPresencial2Audience: string;
  planFull: string;
  planFullPrice: string;
  planFullDesc: string;
  planFullAudience: string;
  popular: string;
  planCta: string;
};

const plans = [
  (c: Content) => ({
    name: c.planOnline,
    price: c.planOnlinePrice,
    per: c.planOnlinePer,
    desc: c.planOnlineDesc,
    audience: c.planOnlineAudience,
    popular: false,
  }),
  (c: Content) => ({
    name: c.planPresencial1,
    price: c.planPresencial1Price,
    per: c.planOnlinePer,
    desc: c.planPresencial1Desc,
    audience: c.planPresencial1Audience,
    popular: true,
  }),
  (c: Content) => ({
    name: c.planPresencial2,
    price: c.planPresencial2Price,
    per: c.planOnlinePer,
    desc: c.planPresencial2Desc,
    audience: c.planPresencial2Audience,
    popular: false,
  }),
  (c: Content) => ({
    name: c.planFull,
    price: c.planFullPrice,
    per: c.planOnlinePer,
    desc: c.planFullDesc,
    audience: c.planFullAudience,
    popular: false,
  }),
];

export function Plans({ content }: { content: Content }) {
  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {content.plansTitle}
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((fn, i) => {
            const plan = fn(content);
            return (
              <div
                key={i}
                className={`relative flex flex-col rounded-xl border p-6 transition-all hover:shadow-lg ${
                  plan.popular
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--primary)]/30"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-0.5 text-xs font-semibold text-white">
                    {content.popular}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {plan.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[var(--primary)]">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {plan.per}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {plan.desc}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]/80">
                  {plan.audience}
                </p>
                <Link
                  href="/aula-experimental"
                  className={`mt-6 w-full rounded-lg py-3 text-center font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    plan.popular ? "btn btn-primary" : "btn btn-secondary"
                  }`}
                >
                  {content.planCta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
