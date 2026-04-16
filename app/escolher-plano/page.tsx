import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { PlanCard } from "./PlanCard";
import { EscolherPlanoToolbar } from "./EscolherPlanoToolbar";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ stripe?: string }> };

export default async function EscolherPlanoPage({ searchParams }: Props) {
  const { stripe: stripeQuery } = await searchParams;
  const [dbUser, studentId, locale] = await Promise.all([
    getCurrentDbUser(),
    getCurrentStudentId(),
    getLocaleFromCookies(),
  ]);
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();

  let schoolId: string | null = null;
  if (studentId) {
    const { data: student } = await supabase
      .from("Student")
      .select("schoolId, planId")
      .eq("id", studentId)
      .single();
    schoolId = student?.schoolId ?? null;
    if (student?.planId) {
      redirect("/dashboard");
    }
  }

  // Catálogo partilhado: planos da escola do aluno + planos em default-school-001 (seed / rede).
  // Só filtrar por .eq(schoolId) escondia todos os planos quando o aluno não estava na mesma escola que o registo do plano.
  let plansQuery = supabase
    .from("Plan")
    .select("id, name, description, priceMonthly, includesDigitalAccess, includes_performance_tracking, includes_check_in, modalityScope, includes_exclusive_benefits, stripePriceId")
    .eq("isActive", true);
  if (schoolId) {
    const schoolIds = Array.from(new Set([schoolId, "default-school-001"]));
    plansQuery = plansQuery.in("schoolId", schoolIds);
  }

  const [plansRes, planPricesRes] = await Promise.all([
    plansQuery.order("priceMonthly", { ascending: true }),
    supabase.from("PlanPrice").select("planId, stripePriceId, intervalLabel, amountCents, sortOrder").eq("isActive", true).order("sortOrder", { ascending: true }),
  ]);
  const plans = plansRes.data;
  const planPrices = planPricesRes.data;

  const t = getTranslations((locale as "pt" | "en") ?? "pt");

  const stripeBanner =
    stripeQuery === "success"
      ? t("choosePlanStripeSuccess")
      : stripeQuery === "cancel"
        ? t("choosePlanStripeCancel")
        : null;

  return (
    <main
      className="min-h-screen p-6 bg-bg"
      style={{ color: "var(--text-primary)" }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <EscolherPlanoToolbar
          siteHomeLabel={t("choosePlanSiteHome")}
          dashboardLabel={t("choosePlanBackToDashboard")}
          signOutLabel={t("signOut")}
        />
        {stripeBanner && (
          <div
            role="status"
            className="card"
            style={{
              marginBottom: 24,
              padding: "clamp(14px, 3.5vw, 18px)",
              borderLeft: "4px solid var(--primary)",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "var(--text-primary)",
            }}
          >
            {stripeBanner}
          </div>
        )}
        <h1
          style={{
            fontSize: "clamp(24px, 5vw, 28px)",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {t("choosePlanTitle")}
        </h1>
        <p
          style={{
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
            marginBottom: 32,
          }}
        >
          {t("choosePlanSubtitle")}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {(plans ?? []).map((plan) => {
            const prices = (planPrices ?? []).filter((pp) => pp.planId === plan.id);
            const hasStripe = plan.name.toLowerCase().includes("kingdom online") && (!!plan.stripePriceId || prices.length > 0);
            const planPricesForCard = prices.length > 0
              ? prices.map((pp) => ({ stripePriceId: pp.stripePriceId, intervalLabel: pp.intervalLabel, amountCents: pp.amountCents }))
              : plan.stripePriceId
                ? [{ stripePriceId: plan.stripePriceId, intervalLabel: t("perMonth"), amountCents: Math.round(Number(plan.priceMonthly) * 100) }]
                : undefined;
            return (
              <PlanCard
                key={plan.id}
                plan={{
                  id: plan.id,
                  name: plan.name,
                  description: plan.description,
                  price_monthly: Number(plan.priceMonthly),
                  includes_digital_access: plan.includesDigitalAccess === true,
                  includes_performance_tracking: plan.includes_performance_tracking !== false,
                  includes_check_in: plan.includes_check_in !== false,
                  modality_scope: plan.modalityScope,
                  includes_exclusive_benefits: plan.includes_exclusive_benefits === true,
                  hasStripe,
                  planPrices: planPricesForCard,
                }}
                studentId={studentId}
                locale={(locale as "pt" | "en") ?? "pt"}
                perMonth={t("perMonth")}
                loading={t("loading")}
                choosePlanSelect={t("choosePlanSelect")}
                stripePriceInvalidMessage={t("choosePlanStripePriceInvalid")}
              />
            );
          })}
        </div>
        {(!plans || plans.length === 0) && (
          <p style={{ fontSize: 16, color: "var(--text-secondary)" }}>
            {t("choosePlanNoPlans")}
          </p>
        )}
      </div>
    </main>
  );
}
