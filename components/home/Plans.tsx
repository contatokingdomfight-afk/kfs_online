import Link from "next/link";
import type { PublicPlan } from "@/lib/public-plans";

type Props = {
  plans: PublicPlan[];
  plansTitle: string;
  planPer: string;
  planCta: string;
  popular: string;
  noPlans: string;
  locale: "pt" | "en";
};

function formatPlanPrice(amount: number, locale: "pt" | "en") {
  return amount.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function Plans({ plans, plansTitle, planPer, planCta, popular, noPlans, locale }: Props) {
  return (
    <section id="plans" className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {plansTitle}
        </h2>
        {plans.length === 0 ? (
          <p className="mt-12 text-center text-[var(--text-secondary)]">{noPlans}</p>
        ) : (
          <div
            className="mt-12 grid gap-6"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}
          >
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border p-6 transition-all hover:shadow-lg ${
                  plan.popular
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--primary)]/30"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-0.5 text-xs font-semibold text-white">
                    {popular}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[var(--primary)]">
                    {formatPlanPrice(plan.priceMonthly, locale)}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">{planPer}</span>
                </div>
                {plan.description ? (
                  <p className="mt-3 text-sm text-[var(--text-secondary)] whitespace-pre-line">{plan.description}</p>
                ) : null}
                <div className="mt-auto pt-6">
                  <Link
                    href="/aula-experimental"
                    className={`block w-full rounded-lg py-3 text-center font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      plan.popular ? "btn btn-primary" : "btn btn-secondary"
                    }`}
                  >
                    {planCta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
