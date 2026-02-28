import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getWeekStartMonday } from "@/lib/lesson-utils";
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

export default async function TemaSemanaPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();
  const weekStart = getWeekStartMonday();

  const { data: themes } = await supabase
    .from("WeekTheme")
    .select("modality, title, course_id")
    .eq("week_start", weekStart);

  const { data: courses } = await supabase
    .from("Course")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const themeByModality = new Map((themes ?? []).map((t) => [t.modality, t]));
  const courseList = courses ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px, 6vw, 32px)", maxWidth: "min(480px, 100%)" }}>
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
          {formatWeekLabel(weekStart, locale)} · {t("weekThemeDescriptionCoach")}
        </p>
      </div>

      <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {t("weekThemeHint")}
      </p>

      {MODALITIES.map((modality) => {
        const theme = themeByModality.get(modality);
        return (
          <TemaSemanaForm
            key={modality}
            modality={modality}
            initialTitle={theme?.title ?? ""}
            initialCourseId={theme?.course_id ?? null}
            courses={courseList}
            initialLocale={locale as "pt" | "en"}
          />
        );
      })}
    </div>
  );
}
