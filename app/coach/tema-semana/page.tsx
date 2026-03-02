import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getWeekStartMonday, getWeekStartMondayForDate } from "@/lib/lesson-utils";
import { TemaSemanaForm } from "./TemaSemanaForm";

const MODALITIES = ["MUAY_THAI", "BOXING", "KICKBOXING"] as const;

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
  return getWeekStartMondayForDate(d2);
}

type Props = { searchParams: Promise<{ week?: string }> };

export default async function TemaSemanaPage({ searchParams }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const params = await searchParams;
  const currentWeek = getWeekStartMonday();
  let weekStart = currentWeek;
  if (params.week) {
    const parsed = getWeekStartMondayForDate(new Date(params.week));
    if (parsed) weekStart = parsed;
  }

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();

  const { data: themes } = await supabase
    .from("WeekTheme")
    .select("modality, title, course_id, video_url")
    .eq("week_start", weekStart);

  const { data: courses } = await supabase
    .from("Course")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const themeByModality = new Map((themes ?? []).map((th) => [th.modality, th]));
  const courseList = courses ?? [];
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

      <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {t("weekThemeHint")}
      </p>

      {MODALITIES.map((modality) => {
        const theme = themeByModality.get(modality);
        return (
          <TemaSemanaForm
            key={modality}
            weekStart={weekStart}
            modality={modality}
            initialTitle={theme?.title ?? ""}
            initialCourseId={theme?.course_id ?? null}
            initialVideoUrl={theme?.video_url ?? ""}
            courses={courseList}
            initialLocale={locale as "pt" | "en"}
          />
        );
      })}
    </div>
  );
}
