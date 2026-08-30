import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { requirePlan } from "@/lib/require-plan";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { normalizeModalityCode } from "@/lib/modality-normalize";
import { PUBLIC_SCHEDULE_WEEKDAYS } from "@/lib/weekday-labels";
import { currentYearMonth, getMonthRange, loadWeekThemeMonthlyGrid } from "@/lib/week-theme-monthly";
import { WeekThemeMonthlyTable } from "@/components/week-theme/WeekThemeMonthlyTable";

type Props = { searchParams: Promise<{ modality?: string }> };

function nextYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function StudentTemaSemanaPage({ searchParams }: Props) {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/dashboard");

  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  const params = await searchParams;

  const [{ data: student }, modalities] = await Promise.all([
    supabase.from("Student").select("primaryModality").eq("id", studentId).single(),
    getCachedModalityRefs(supabase),
  ]);

  if (modalities.length === 0) redirect("/dashboard");

  const studentModality = normalizeModalityCode((student as { primaryModality?: string | null } | null)?.primaryModality ?? null);
  const selectedModality =
    params.modality && modalities.some((m) => m.code === params.modality)
      ? params.modality
      : (studentModality && modalities.some((m) => m.code === studentModality) ? studentModality : modalities[0].code);

  const currentMonth = currentYearMonth();
  const nextMonth = nextYearMonth(currentMonth);

  const [currentWeeks, nextWeeks] = await Promise.all([
    loadWeekThemeMonthlyGrid(supabase, selectedModality, currentMonth, locale),
    loadWeekThemeMonthlyGrid(supabase, selectedModality, nextMonth, locale),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 28px)", maxWidth: "min(720px, 100%)", width: "100%" }}>
      <div>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("studentTemaSemanaTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("studentTemaSemanaDescription")}
        </p>
      </div>

      {modalities.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {modalities.map((m) => (
            <Link
              key={m.code}
              href={`/dashboard/tema-semana?modality=${m.code}`}
              className={m.code === selectedModality ? "btn btn-primary" : "btn btn-secondary"}
              style={{ textDecoration: "none", fontSize: "clamp(13px, 3.2vw, 15px)" }}
            >
              {MODALITY_LABELS[m.code] ?? m.name}
            </Link>
          ))}
        </div>
      )}

      <div>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {getMonthRange(currentMonth).label}
        </h2>
        <WeekThemeMonthlyTable weeks={currentWeeks} weekdays={PUBLIC_SCHEDULE_WEEKDAYS} locale={locale} />
      </div>

      <div>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {getMonthRange(nextMonth).label}
        </h2>
        <WeekThemeMonthlyTable weeks={nextWeeks} weekdays={PUBLIC_SCHEDULE_WEEKDAYS} locale={locale} />
      </div>

      <Link href="/dashboard" className="btn btn-secondary" style={{ textDecoration: "none", display: "inline-block", width: "fit-content" }}>
        {t("studentTemaSemanaBack")}
      </Link>
    </div>
  );
}
