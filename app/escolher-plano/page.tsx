import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { PlanCard } from "./PlanCard";
import { EscolherPlanoToolbar } from "./EscolherPlanoToolbar";
import { StudentOnboardingFeesNotice } from "@/components/StudentOnboardingFeesNotice";
import { getStudentOnboardingFeesState } from "@/lib/student-onboarding-fees";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { PLANS_EXCLUDED_FROM_SELF_SERVICE } from "@/lib/kingdom-plans-constants";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ inscricao?: string }> };

export default async function EscolherPlanoPage({ searchParams }: Props) {
  await searchParams;
  const [dbUser, studentId, locale] = await Promise.all([
    getCurrentDbUser(),
    getCurrentStudentId(),
    getLocaleFromCookies(),
  ]);
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();

  let schoolId: string | null = null;
  let onboardingFees = null;
  if (studentId) {
    const { data: student } = await supabase
      .from("Student")
      .select("schoolId, planId")
      .eq("id", studentId)
      .single();
    schoolId = student?.schoolId ?? null;
    if (student?.planId) {
      redirect("/dashboard/financeiro?pagamento_escola=1");
    }
    onboardingFees = await getStudentOnboardingFeesState(supabase, studentId);
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

  const [plansRes, modalityRefs] = await Promise.all([
    plansQuery.order("priceMonthly", { ascending: true }),
    getCachedModalityRefs(supabase),
  ]);
  const plans = plansRes.data?.filter((p) => !PLANS_EXCLUDED_FROM_SELF_SERVICE.includes(p.id)) ?? null;

  const t = getTranslations((locale as "pt" | "en") ?? "pt");

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
        {onboardingFees && (onboardingFees.showEnrollment || onboardingFees.showInsurance) && (
          <StudentOnboardingFeesNotice
            enrollmentAmount={onboardingFees.enrollmentAmount}
            insuranceAmount={onboardingFees.insuranceAmount}
            showEnrollment={onboardingFees.showEnrollment}
            showInsurance={onboardingFees.showInsurance}
            locale={(locale as "pt" | "en") ?? "pt"}
          />
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {(plans ?? []).map((plan) => (
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
              }}
              studentId={studentId}
              locale={(locale as "pt" | "en") ?? "pt"}
              perMonth={t("perMonth")}
              choosePlanSelect={t("choosePlanSelect")}
              choosePlanModalityLabel={t("choosePlanModalityLabel")}
              modalityOptions={modalityRefs}
              fees={{
                tuition: Number(plan.priceMonthly),
                enrollment: onboardingFees?.enrollmentAmount ?? 0,
                insurance: onboardingFees?.insuranceAmount ?? 0,
                showEnrollment: onboardingFees?.showEnrollment ?? false,
                showInsurance: onboardingFees?.showInsurance ?? false,
              }}
              modalTitle={t("choosePlanModalTitle")}
              modalBody={t("choosePlanModalBody")}
              modalConfirm={t("choosePlanModalConfirm")}
              modalCancel={t("choosePlanModalCancel")}
              modalTotal={t("choosePlanModalTotal")}
              modalTuition={t("choosePlanModalTuition")}
              modalEnrollment={t("choosePlanModalEnrollment")}
              modalInsurance={t("choosePlanModalInsurance")}
            />
          ))}
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
