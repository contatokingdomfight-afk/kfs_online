import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { Suspense } from "react";
import { AdminDashboardSkeleton } from "./AdminDashboardSkeleton";
import { AdminDashboardContent } from "./AdminDashboardContent";

type SearchParams = Promise<{ school?: string }>;

export default async function AdminHomePage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const params = await searchParams;
  const schoolId = (params.school?.trim() || null) || null;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)", minWidth: 0, overflowX: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "clamp(12px, 3vw, 16px)", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
          {t("helloAdmin")} {dbUser?.name || t("admin")}.
        </p>
      </div>

      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardContent client={result.client} schoolId={schoolId} />
      </Suspense>
    </div>
  );
}
