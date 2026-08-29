import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getModalitiesForWeekThemeEditor } from "@/lib/coach-week-theme-modalities";
import { getWeekStartMondayForDateInLisbon, getWeekStartMondayLisbon } from "@/lib/lisbon-week";
import { getWeekThemeDaysForWeek } from "@/lib/week-theme-days";
import { TemaSemanaForm } from "./TemaSemanaForm";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function formatWeekLabel(weekStart: string, locale: string): string {
  try {
    const [y, m, d] = weekStart.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const loc = locale === "en" ? "en-GB" : "pt-PT";
    return start.toLocaleDateString(loc, { day: "2-digit", month: "short" }) + " – " + end.toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return weekStart;
  }
}

function addWeeks(weekStart: string, delta: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const d2 = new Date(y, m - 1, d);
  d2.setDate(d2.getDate() + delta * 7);
  const ymd = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
  return getWeekStartMondayForDateInLisbon(ymd);
}

type Props = { searchParams: Promise<{ week?: string }> };

export default async function TemaSemanaPage({ searchParams }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const params = await searchParams;
  const currentWeek = getWeekStartMondayLisbon();
  let weekStart = currentWeek;
  const w = params.week?.trim() ?? "";
  if (w && YMD.test(w)) {
    weekStart = getWeekStartMondayForDateInLisbon(w);
  }

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();
  const modalitiesForEditor = await getModalitiesForWeekThemeEditor(supabase, dbUser.role, await getCurrentCoachId());

  const { data: themes } = await supabase
    .from("WeekTheme")
    .select("modality, title, description, course_id, unit_id, video_url")
    .eq("week_start", weekStart);

  const weekThemeDays = await getWeekThemeDaysForWeek(supabase, weekStart);

  const { data: courses } = await supabase
    .from("Course")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const courseList = courses ?? [];
  const courseIds = courseList.map((c) => c.id);

  let unitsByCourse: Record<string, { id: string; name: string }[]> = {};
  if (courseIds.length > 0) {
    const { data: modules } = await supabase
      .from("CourseModule")
      .select("id, course_id, sort_order")
      .in("course_id", courseIds)
      .eq("status", "PUBLISHED")
      .order("sort_order", { ascending: true });
    const moduleList = modules ?? [];
    const moduleIds = moduleList.map((m) => m.id);
    const courseIdByModuleId = new Map(moduleList.map((m) => [m.id, m.course_id as string]));
    if (moduleIds.length > 0) {
      const { data: units } = await supabase
        .from("CourseUnit")
        .select("id, module_id, name, sort_order")
        .in("module_id", moduleIds)
        .eq("status", "PUBLISHED")
        .order("sort_order", { ascending: true });
      (units ?? []).forEach((u) => {
        const courseId = courseIdByModuleId.get(u.module_id);
        if (!courseId) return;
        const list = unitsByCourse[courseId] ?? (unitsByCourse[courseId] = []);
        list.push({ id: u.id, name: u.name });
      });
    }
  }

  const themeByModality = new Map((themes ?? []).map((th) => [th.modality, th]));
  const daysByModality = new Map<string, Record<number, string>>();
  for (const row of weekThemeDays) {
    const days = daysByModality.get(row.modality) ?? {};
    days[row.weekday] = row.topic;
    daysByModality.set(row.modality, days);
  }
  const prevWeek = addWeeks(weekStart, -1);
  const nextWeek = addWeeks(weekStart, 1);
  const isCurrentWeek = weekStart === currentWeek;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px, 6vw, 32px)", maxWidth: "min(520px, 100%)", width: "100%" }}>
      <div>
        <Link
          href="/coach"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
            display: "inline-block",
            marginBottom: 8,
          }}
        >
          ← {t("back")}
        </Link>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("navWeekTheme")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("weekThemeDescriptionCoach")}
        </p>
        <Link
          href="/coach/tema-semana/mensal"
          style={{ display: "inline-block", marginTop: 8, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500, textDecoration: "none" }}
        >
          {t("navWeekThemeMonthly")} →
        </Link>
      </div>

      {/* Navegação entre semanas — responsiva, toque fácil */}
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
          href={`/coach/tema-semana?week=${prevWeek}`}
          className="btn"
          style={{
            minHeight: 44,
            minWidth: 44,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontSize: 18,
            color: "var(--text-primary)",
          }}
        >
          ←
        </Link>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>
          {formatWeekLabel(weekStart, locale)}
        </span>
        <Link
          href={`/coach/tema-semana?week=${nextWeek}`}
          className="btn"
          style={{
            minHeight: 44,
            minWidth: 44,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontSize: 18,
            color: "var(--text-primary)",
          }}
        >
          →
        </Link>
      </div>
      {!isCurrentWeek && (
        <Link
          href="/coach/tema-semana"
          style={{ fontSize: 14, color: "var(--primary)", textDecoration: "underline" }}
        >
          Ir para a semana atual
        </Link>
      )}

      {modalitiesForEditor.length > 0 ? (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("weekThemeHint")}
        </p>
      ) : null}

      {modalitiesForEditor.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            padding: "clamp(12px, 3vw, 16px)",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
        >
          {t("weekThemeNoCoachLessons")}
        </p>
      ) : null}

      {modalitiesForEditor.map((modality) => {
        const theme = themeByModality.get(modality);
        return (
          <TemaSemanaForm
            key={modality}
            weekStart={weekStart}
            modality={modality}
            initialTitle={theme?.title ?? ""}
            initialDescription={theme?.description ?? ""}
            initialCourseId={theme?.course_id ?? null}
            initialUnitId={(theme as { unit_id?: string | null } | undefined)?.unit_id ?? null}
            initialVideoUrl={theme?.video_url ?? ""}
            initialDaysByWeekday={daysByModality.get(modality) ?? {}}
            courses={courseList}
            unitsByCourse={unitsByCourse}
            initialLocale={locale as "pt" | "en"}
          />
        );
      })}
    </div>
  );
}
