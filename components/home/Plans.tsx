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
  planPriceOnRequest: string;
  planCtaOnRequest: string;
  familyPlanHighlight: string;
  familyPlanNote: string;
};

function formatPlanPrice(amount: number, locale: "pt" | "en") {
  return amount.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

/** Planos KIDS (nome com «Kids») vão para o carrossel das crianças; o resto (incl. família) para o dos adultos. */
export function isKidsPlan(plan: Pick<PublicPlan, "name">): boolean {
  return /kids/i.test(plan.name);
}

export function Plans({
  plans,
  plansTitle,
  planPer,
  planCta,
  popular,
  noPlans,
  locale,
  planPriceOnRequest,
  planCtaOnRequest,
  familyPlanHighlight,
  familyPlanNote,
}: Props) {
  return (
    <section id="plans" className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
          {plansTitle}
        </h2>
        {plans.length === 0 ? (
          <p className="mt-12 text-center text-[var(--text-secondary)]">{noPlans}</p>
        ) : (
          <div className="mt-10 flex flex-col gap-10">
            {[
              { key: "adultos", title: locale === "en" ? "Adults" : "Adultos", items: plans.filter((p) => !isKidsPlan(p)) },
              { key: "kids", title: "Kids", items: plans.filter((p) => isKidsPlan(p)) },
            ]
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <div key={group.key}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{group.title}</h3>
                    {group.items.length > 1 && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        {locale === "en" ? "Swipe to see more →" : "Arrasta para ver mais →"}
                      </span>
                    )}
                  </div>
                  {/* Carrossel: arrastar/deslizar na horizontal; cada cartão encaixa no início. */}
                  <div
                    className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
                    style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
                    aria-label={group.title}
                  >
                    {group.items.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative flex w-[min(80vw,280px)] shrink-0 snap-start flex-col rounded-xl border p-6 transition-all hover:shadow-lg ${
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
                          {plan.priceOnRequest ? (
                            <span className="text-2xl font-bold text-[var(--primary)]">{planPriceOnRequest}</span>
                          ) : (
                            <>
                              <span className="text-2xl font-bold text-[var(--primary)]">
                                {formatPlanPrice(plan.priceMonthly, locale)}
                              </span>
                              <span className="text-sm text-[var(--text-secondary)]">{planPer}</span>
                            </>
                          )}
                        </div>
                        {plan.description ? (
                          <p className="mt-3 text-sm text-[var(--text-secondary)]">{plan.description}</p>
                        ) : null}
                        {plan.priceOnRequest ? (
                          <div className="mt-3 rounded-lg bg-[var(--primary)]/10 px-3 py-2" title={familyPlanNote}>
                            <p className="line-clamp-2 text-xs font-bold text-[var(--primary)]">{familyPlanHighlight}</p>
                          </div>
                        ) : null}
                        <div className="mt-auto pt-4">
                          <Link
                            href={`/aula-experimental?plano=${encodeURIComponent(plan.id)}`}
                            className={`block w-full rounded-lg py-3 text-center font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                              plan.popular ? "btn btn-primary" : "btn btn-secondary"
                            }`}
                          >
                            {plan.priceOnRequest ? planCtaOnRequest : planCta}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
