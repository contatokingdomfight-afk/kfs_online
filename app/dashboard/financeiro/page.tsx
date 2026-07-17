import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { StripeSubscribeButtons } from "./StripeSubscribeButtons";
import { StudentOnboardingFeesNotice } from "@/components/StudentOnboardingFeesNotice";
import { getStudentOnboardingFeesState } from "@/lib/student-onboarding-fees";
import { SchoolPaymentPendingModal } from "./SchoolPaymentPendingModal";
import { getFamilyContext } from "@/lib/family-context";
import { resolveFamilyGroupTitularSuggestedAmount } from "@/lib/family-tuition";

export const dynamic = "force-dynamic";

function formatRefMonth(ref: string, locale: string): string {
  const [y, m] = ref.split("-");
  const month = parseInt(m, 10);
  const date = new Date(parseInt(y, 10), month - 1, 1);
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { month: "long", year: "numeric" });
}

export default async function DashboardFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ pagamento_escola?: string; inscricao?: string }>;
}) {
  await searchParams;
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  let plan: { name: string; price_monthly: number } | null = null;
  let payments: {
    id: string;
    referenceMonth: string | null;
    referenceYear: string | null;
    paymentType: string;
    amount: number;
    status: string;
    createdAt: string;
  }[] = [];
  let hasStripeCustomer = false;
  let onboardingFees = null;
  let plansWithStripe: { id: string; name: string; price_monthly: number; stripePriceId?: string; planPrices?: { stripePriceId: string; intervalLabel: string; amountCents: number }[] }[] = [];

  let awaitingSchoolPayment = false;
  let familyRole: "TITULAR" | "MEMBER" | null = null;

  if (studentId) {
    const { data: student } = await supabase
      .from("Student")
      .select("planId, stripeCustomerId")
      .eq("id", studentId)
      .single();
    hasStripeCustomer = !!(student as { stripeCustomerId?: string | null } | null)?.stripeCustomerId;
    if (student?.planId) {
      const { data: planRow } = await supabase
        .from("Plan")
        .select("name, priceMonthly")
        .eq("id", student.planId)
        .eq("isActive", true)
        .single();
      if (planRow) {
        plan = { name: planRow.name, price_monthly: Number(planRow.priceMonthly) };
      }

      const familyCtx = await getFamilyContext(supabase, studentId);
      if (familyCtx) {
        familyRole = familyCtx.role;
        if (familyCtx.isTitular) {
          const amount = await resolveFamilyGroupTitularSuggestedAmount(supabase, familyCtx.group.id);
          plan = { name: planRow?.name ?? "Kingdom Família", price_monthly: amount };
        }
      }
    }

    const { data: plans } = await supabase
      .from("Plan")
      .select("id, name, priceMonthly, stripePriceId")
      .eq("isActive", true);
    const { data: planPrices } = await supabase
      .from("PlanPrice")
      .select("planId, stripePriceId, intervalLabel, amountCents")
      .eq("isActive", true)
      .order("sortOrder", { ascending: true });
    const plansWithStripeData: { id: string; name: string; price_monthly: number; stripePriceId?: string; planPrices?: { stripePriceId: string; intervalLabel: string; amountCents: number }[] }[] = [];
    for (const p of plans ?? []) {
      const prices = (planPrices ?? []).filter((pp) => pp.planId === p.id);
      if (prices.length > 0) {
        plansWithStripeData.push({
          id: p.id,
          name: p.name,
          price_monthly: prices[0].amountCents / 100,
          stripePriceId: prices[0].stripePriceId,
          planPrices: prices.map((x) => ({ stripePriceId: x.stripePriceId, intervalLabel: x.intervalLabel, amountCents: x.amountCents })),
        });
      } else if (p.stripePriceId) {
        plansWithStripeData.push({
          id: p.id,
          name: p.name,
          price_monthly: Number(p.priceMonthly),
          stripePriceId: p.stripePriceId,
        });
      }
    }
    plansWithStripe = plansWithStripeData;

    const { data: paymentRows } = await supabase
      .from("Payment")
      .select("id, amount, status, referenceMonth, referenceYear, paymentType, createdAt")
      .eq("studentId", studentId)
      .order("createdAt", { ascending: false })
      .limit(24);
    payments = (paymentRows ?? []).map((p) => ({
      id: p.id,
      referenceMonth: (p.referenceMonth as string | null) ?? null,
      referenceYear: ((p as { referenceYear?: string | null }).referenceYear as string | null) ?? null,
      paymentType: String((p as { paymentType?: string }).paymentType ?? "TUITION"),
      amount: Number(p.amount),
      status: p.status,
      createdAt: String(p.createdAt),
    }));

    onboardingFees = await getStudentOnboardingFeesState(supabase, studentId);
    awaitingSchoolPayment = payments.length > 0 && !payments.some((p) => p.status === "PAID");
  }

  const loc = locale === "en" ? "en" : "pt";
  const modalFees = {
    tuition: plan?.price_monthly ?? 0,
    enrollment: onboardingFees?.enrollmentAmount ?? 0,
    insurance: onboardingFees?.insuranceAmount ?? 0,
    showEnrollment: onboardingFees?.showEnrollment ?? false,
    showInsurance: onboardingFees?.showInsurance ?? false,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Suspense fallback={null}>
        <SchoolPaymentPendingModal
          showGate={awaitingSchoolPayment}
          planName={plan?.name ?? "—"}
          fees={modalFees}
          locale={loc}
          title={t("schoolPaymentGateTitle")}
          body={t("schoolPaymentGateBody")}
          dismissLabel={t("schoolPaymentGateDismiss")}
          totalLabel={t("choosePlanModalTotal")}
          tuitionLabel={t("choosePlanModalTuition")}
          enrollmentLabel={t("choosePlanModalEnrollment")}
          insuranceLabel={t("choosePlanModalInsurance")}
        />
      </Suspense>
      <header>
        <h1 className="text-xl font-bold text-text-primary">{t("financeTitle")}</h1>
        <p className="text-sm text-text-secondary mt-1">
          Plano, pagamentos e comprovantes. Para alterar dados de pagamento, contacta a secretaria.
        </p>
      </header>

      {awaitingSchoolPayment && (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-text-primary"
        >
          {t("schoolPaymentGateBanner")}
        </div>
      )}

      {onboardingFees && (onboardingFees.showEnrollment || onboardingFees.showInsurance) && (
        <StudentOnboardingFeesNotice
          enrollmentAmount={onboardingFees.enrollmentAmount}
          insuranceAmount={onboardingFees.insuranceAmount}
          showEnrollment={onboardingFees.showEnrollment}
          showInsurance={onboardingFees.showInsurance}
          locale={locale === "en" ? "en" : "pt"}
        />
      )}

      {/* Plano atual */}
      <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
        <h2 className="text-base font-bold text-text-primary mb-3">{t("financePlanSection")}</h2>
        {plan && familyRole === "MEMBER" ? (
          <p className="text-text-primary font-semibold">
            {plan.name} · {locale === "en" ? "no tuition of your own (paid by the plan holder)" : "sem mensalidade própria (paga pelo titular)"}
          </p>
        ) : plan ? (
          <p className="text-text-primary font-semibold">
            {plan.name} · €{plan.price_monthly.toFixed(0)}{t("perMonth")}
          </p>
        ) : (
          <p className="text-text-secondary text-sm">{t("noPlanAssigned")}</p>
        )}
      </section>

      {/* Pagamento por cartão (Stripe) */}
      {familyRole ? (
        <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
          <h2 className="text-base font-bold text-text-primary mb-2">
            {locale === "en" ? "Card payment (Stripe)" : "Pagamento por cartão"}
          </h2>
          <p className="text-sm text-text-secondary">
            {locale === "en"
              ? "Family plan billing is handled by the school office, not self-service card checkout. Contact us to arrange payment."
              : "A mensalidade do plano família é gerida pela secretaria, não por assinatura individual com cartão. Fala connosco para tratar do pagamento."}
          </p>
        </section>
      ) : (
        <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md space-y-4">
          <h2 className="text-base font-bold text-text-primary">
            {locale === "en" ? "Card payment (Stripe)" : "Pagamento por cartão"}
          </h2>
          <p className="text-sm text-text-secondary">
            {locale === "en"
              ? "Subscribe or manage your subscription with card. You can update your payment method and view invoices in the portal."
              : "Subscreve ou gere a tua assinatura com cartão. No portal podes atualizar o método de pagamento e ver faturas."}
          </p>
          <StripeSubscribeButtons
            hasStripeCustomer={hasStripeCustomer}
            plansWithStripe={plansWithStripe}
            locale={locale === "en" ? "en" : "pt"}
            subscribeLabel={locale === "en" ? "Subscribe with card" : "Subscrever com cartão"}
            manageLabel={locale === "en" ? "Manage subscription / card" : "Gerir assinatura / cartão"}
            perMonthLabel={t("perMonth")}
            stripePriceInvalidMessage={t("choosePlanStripePriceInvalid")}
          />
        </section>
      )}

      {/* Forma de pagamento e comprovante (informação) */}
      <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md space-y-4">
        <h2 className="text-base font-bold text-text-primary">{t("paymentProofLabel")}</h2>
        <p className="text-sm text-text-secondary">{t("contactSecretaryPaymentInfo")}</p>
      </section>

      {/* Últimos pagamentos */}
      <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
        <h2 className="text-base font-bold text-text-primary mb-4">{t("lastPaymentsLabel")}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-text-secondary">{t("noPaymentsYet")}</p>
        ) : (
          <ul className="space-y-3">
            {payments.map((p) => {
              const label =
                p.paymentType === "ENROLLMENT"
                  ? locale === "en"
                    ? "Enrollment fee"
                    : "Matrícula"
                  : p.paymentType === "INSURANCE"
                    ? `${locale === "en" ? "Insurance" : "Seguro"} ${p.referenceYear ?? ""}`
                    : p.referenceMonth
                      ? formatRefMonth(p.referenceMonth, locale)
                      : "—";
              return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0"
              >
                <span className="text-text-primary font-medium capitalize">{label}</span>
                <span className="text-text-primary">€{p.amount.toFixed(2)}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    p.status === "PAID"
                      ? "bg-green-500/20 text-green-700 dark:text-green-400"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {p.status === "PAID" ? t("paymentPaid") : t("paymentLate")}
                </span>
              </li>
            );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-text-secondary">
        {!awaitingSchoolPayment && (
          <Link href="/dashboard" className="underline hover:no-underline">
            ← {locale === "en" ? "Back to home" : "Voltar ao início"}
          </Link>
        )}
      </p>
    </div>
  );
}
