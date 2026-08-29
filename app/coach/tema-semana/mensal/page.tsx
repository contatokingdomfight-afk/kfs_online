import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getModalitiesForWeekThemeEditor } from "@/lib/coach-week-theme-modalities";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { PUBLIC_SCHEDULE_WEEKDAYS } from "@/lib/weekday-labels";
import { currentYearMonth, getMonthRange, loadWeekThemeMonthlyGrid } from "@/lib/week-theme-monthly";
import { WeekThemeMonthlyTable } from "@/components/week-theme/WeekThemeMonthlyTable";

type Props = { searchParams: Promise<{ month?: string; modality?: string }> };

function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TemaSemanaMensalPage({ searchParams }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const params = await searchParams;
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const supabase = await createClient();

  const allowedModalities = await getModalitiesForWeekThemeEditor(supabase, dbUser.role, await getCurrentCoachId());
  const selectedModality =
    params.modality && allowedModalities.includes(params.modality) ? params.modality : allowedModalities[0];
  const selectedMonth = params.month ?? currentYearMonth();
  const { label: monthLabel } = getMonthRange(selectedMonth);
  const prevMonth = addMonths(selectedMonth, -1);
  const nextMonth = addMonths(selectedMonth, 1);

  const weeks = selectedModality
    ? await loadWeekThemeMonthlyGrid(supabase, selectedModality, selectedMonth, locale)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 28px)", maxWidth: "min(720px, 100%)", width: "100%" }}>
      <div>
        <Link
          href="/coach/tema-semana"
          style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "inline-block", marginBottom: 8 }}
        >
          ← {t("back")}
        </Link>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("weekThemeMonthlyTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("weekThemeMonthlyDescription")}
        </p>
      </div>

      {allowedModalities.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
            padding: "clamp(12px, 3vw, 16px)",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
        >
          {t("weekThemeNoCoachLessons")}
        </p>
      ) : (
        <>
          {allowedModalities.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {allowedModalities.map((modality) => (
                <Link
                  key={modality}
                  href={`/coach/tema-semana/mensal?month=${selectedMonth}&modality=${modality}`}
                  className={modality === selectedModality ? "btn btn-primary" : "btn btn-secondary"}
                  style={{ textDecoration: "none", fontSize: "clamp(13px, 3.2vw, 15px)" }}
                >
                  {MODALITY_LABELS[modality] ?? modality}
                </Link>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: "clamp(12px, 3vw, 16px)",
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <Link
              href={`/coach/tema-semana/mensal?month=${prevMonth}&modality=${selectedModality}`}
              className="btn"
              style={{ minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 18, color: "var(--text-primary)" }}
            >
              ←
            </Link>
            <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>
              {monthLabel}
            </span>
            <Link
              href={`/coach/tema-semana/mensal?month=${nextMonth}&modality=${selectedModality}`}
              className="btn"
              style={{ minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 18, color: "var(--text-primary)" }}
            >
              →
            </Link>
          </div>

          <WeekThemeMonthlyTable weeks={weeks} weekdays={PUBLIC_SCHEDULE_WEEKDAYS} locale={locale} editHrefBase="/coach/tema-semana" />
        </>
      )}
    </div>
  );
}
