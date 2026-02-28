import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { StripeSubscribeButtons } from "./StripeSubscribeButtons";

export const dynamic = "force-dynamic";

function formatRefMonth(ref: string, locale: string): string {
  const [y, m] = ref.split("-");
  const month = parseInt(m, 10);
  const date = new Date(parseInt(y, 10), month - 1, 1);
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { month: "long", year: "numeric" });
}

export default async function DashboardFinanceiroPage() {
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  let plan: { name: string; price_monthly: number } | null = null;
  let payments: { id: string; referenceMonth: string; amount: number; status: string; createdAt: string }[] = [];
  let hasStripeCustomer = false;
  let plansWithStripe: { id: string; name: string; price_monthly: number }[] = [];

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
        .select("name, price_monthly")
        .eq("id", student.planId)
        .eq("is_active", true)
        .single();
      if (planRow) {
        plan = { name: planRow.name, price_monthly: Number(planRow.price_monthly) };
      }
    }

    const { data: plans } = await supabase
      .from("Plan")
      .select("id, name, price_monthly")
      .eq("is_active", true)
      .not("stripePriceId", "is", null);
    plansWithStripe = (plans ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      price_monthly: Number(p.price_monthly),
    }));

    const { data: paymentRows } = await supabase
      .from("Payment")
      .select("id, amount, status, referenceMonth, createdAt")
      .eq("studentId", studentId)
      .order("createdAt", { ascending: false })
      .limit(24);
    payments = (paymentRows ?? []).map((p) => ({
      id: p.id,
      referenceMonth: p.referenceMonth,
      amount: Number(p.amount),
      status: p.status,
      createdAt: String(p.createdAt),
    }));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-xl font-bold text-text-primary">{t("financeTitle")}</h1>
        <p className="text-sm text-text-secondary mt-1">
          Plano, pagamentos e comprovantes. Para alterar dados de pagamento, contacta a secretaria.
        </p>
      </header>

      {/* Plano atual */}
      <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
        <h2 className="text-base font-bold text-text-primary mb-3">{t("financePlanSection")}</h2>
        {plan ? (
          <p className="text-text-primary font-semibold">
            {plan.name} · €{plan.price_monthly.toFixed(0)}{t("perMonth")}
          </p>
        ) : (
          <p className="text-text-secondary text-sm">{t("noPlanAssigned")}</p>
        )}
      </section>

      {/* Pagamento por cartão (Stripe) */}
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
          subscribeLabel={locale === "en" ? "Subscribe with card" : "Subscrever com cartão"}
          manageLabel={locale === "en" ? "Manage subscription / card" : "Gerir assinatura / cartão"}
          perMonthLabel={t("perMonth")}
        />
      </section>

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
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-0"
              >
                <span className="text-text-primary font-medium capitalize">
                  {formatRefMonth(p.referenceMonth, locale)}
                </span>
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
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-text-secondary">
        <Link href="/dashboard" className="underline hover:no-underline">
          ← {locale === "en" ? "Back to home" : "Voltar ao início"}
        </Link>
      </p>
    </div>
  );
}
