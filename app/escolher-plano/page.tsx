import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { PlanCard } from "./PlanCard";

export const dynamic = "force-dynamic";

export default async function EscolherPlanoPage() {
  const [dbUser, studentId, locale] = await Promise.all([
    getCurrentDbUser(),
    getCurrentStudentId(),
    getLocaleFromCookies(),
  ]);
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();

  let schoolId: string | null = null;
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("schoolId").eq("id", studentId).single();
    schoolId = student?.schoolId ?? null;
  }

  let plansQuery = supabase
    .from("Plan")
    .select("id, name, description, price_monthly, includes_digital_access, includes_performance_tracking, includes_check_in, modality_scope, includes_exclusive_benefits, stripePriceId")
    .eq("is_active", true);
  if (schoolId) plansQuery = plansQuery.eq("schoolId", schoolId);
  const { data: plans } = await plansQuery.order("price_monthly", { ascending: true });

  const t = getTranslations((locale as "pt" | "en") ?? "pt");

  return (
    <main
      className="min-h-screen p-6 bg-bg"
      style={{ color: "var(--text-primary)" }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            marginBottom: 24,
            fontSize: 14,
            color: "var(--text-secondary)",
            textDecoration: "underline",
          }}
        >
          ← {t("back")}
        </Link>
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
          {(plans ?? []).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={{
                id: plan.id,
                name: plan.name,
                description: plan.description,
                price_monthly: Number(plan.price_monthly),
                includes_digital_access: plan.includes_digital_access === true,
                includes_performance_tracking: plan.includes_performance_tracking !== false,
                includes_check_in: plan.includes_check_in !== false,
                modality_scope: plan.modality_scope,
                includes_exclusive_benefits: plan.includes_exclusive_benefits === true,
                hasStripe: !!plan.stripePriceId,
              }}
              studentId={studentId}
              locale={(locale as "pt" | "en") ?? "pt"}
              t={t as (key: string) => string}
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
