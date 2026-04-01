import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getPlanAccess } from "@/lib/plan-access";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getSchoolLeaderboard } from "@/lib/leaderboard";
import { getBeltIndexFromXp, getBeltName } from "@/lib/belts";

export const dynamic = "force-dynamic";

export default async function DashboardRankPage() {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const planAccess = await getPlanAccess(supabase, studentId);
  if (!planAccess.hasPerformanceTracking) {
    redirect("/dashboard?message=plan-no-performance");
  }

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const { rows, error } = await getSchoolLeaderboard(supabase, 100);

  return (
    <div className="max-w-[min(720px,100%)] mx-auto pb-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-[var(--text-secondary)] text-sm sm:text-base font-medium no-underline hover:text-[var(--text-primary)]"
        >
          ← {t("navHome")}
        </Link>
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">{t("rankTitle")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{t("rankSubtitle")}</p>

      {error ? (
        <div
          className="card p-4 text-sm"
          style={{ color: "var(--danger)", borderColor: "var(--border)" }}
        >
          {t("rankError")}: {error}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("rankEmpty")}</p>
      ) : (
        <div className="card overflow-x-auto" style={{ padding: 0 }}>
          <table className="w-full text-sm border-collapse" style={{ minWidth: 280 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th
                  scope="col"
                  className="text-left py-3 px-3 font-semibold text-[var(--text-primary)]"
                  style={{ width: 56 }}
                >
                  #
                </th>
                <th scope="col" className="text-left py-3 px-2 font-semibold text-[var(--text-primary)]">
                  {t("rankColName")}
                </th>
                <th scope="col" className="text-left py-3 px-2 font-semibold text-[var(--text-primary)] hidden sm:table-cell">
                  {t("rankColBelt")}
                </th>
                <th scope="col" className="text-right py-3 px-3 font-semibold text-[var(--text-primary)]">
                  XP
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const beltIdx = getBeltIndexFromXp(row.xp);
                const beltLabel = getBeltName(beltIdx);
                const highlight = row.is_current_user;
                return (
                  <tr
                    key={row.student_id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: highlight ? "var(--bg-secondary)" : undefined,
                    }}
                  >
                    <td className="py-3 px-3 align-middle text-[var(--text-primary)] font-medium">{row.rank}</td>
                    <td className="py-3 px-2 align-middle text-[var(--text-primary)]">
                      {row.display_name || "—"}
                      {highlight && (
                        <span
                          className="ml-2 text-xs font-semibold"
                          style={{ color: "var(--primary)" }}
                        >
                          ({t("rankYou")})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 align-middle text-[var(--text-secondary)] hidden sm:table-cell">
                      {beltLabel}
                    </td>
                    <td className="py-3 px-3 align-middle text-right font-semibold text-[var(--primary)]">
                      {row.xp.toLocaleString(locale === "en" ? "en-GB" : "pt-PT")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
