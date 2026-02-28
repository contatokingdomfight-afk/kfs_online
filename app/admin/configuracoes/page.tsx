import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MetaAssiduidadeForm } from "./MetaAssiduidadeForm";

export default async function AdminConfiguracoesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const { data: goal } = await supabase
    .from("AttendanceGoal")
    .select("id, target_value")
    .eq("is_global", true)
    .limit(1)
    .single();

  return (
    <div style={{ maxWidth: "min(480px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← {t("back")}
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("navSettings")}
      </h1>
      <p style={{ margin: "0 0 clamp(24px, 6vw, 32px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {t("settingsDescription")}
      </p>

      <section className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("attendanceGoalGlobal")}
        </h2>
        <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("attendanceGoalHint")}
        </p>
        <MetaAssiduidadeForm initialTargetValue={goal?.target_value ?? 10} initialLocale={locale as "pt" | "en"} />
      </section>
    </div>
  );
}
