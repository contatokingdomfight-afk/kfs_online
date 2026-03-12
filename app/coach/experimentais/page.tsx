import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCurrentSchoolId } from "@/lib/auth/get-current-school";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";

export default async function CoachExperimentaisPage() {
  const coachId = await getCurrentCoachId();
  const schoolId = await getCurrentSchoolId();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  // Aulas do coach (para filtrar experimentais)
  let lessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  if (coachId) {
    lessonsQuery = lessonsQuery.eq("coachId", coachId);
  }
  if (schoolId) {
    lessonsQuery = lessonsQuery.eq("schoolId", schoolId);
  }

  const { data: coachLessons } = await lessonsQuery;
  const coachLessonIds = new Set((coachLessons ?? []).map((l) => l.id));
  const lessonById = new Map(
    (coachLessons ?? []).map((l) => [
      l.id,
      { modality: l.modality, date: l.date, startTime: l.startTime, endTime: l.endTime },
    ])
  );

  // Experimentais não convertidos, nas aulas do coach
  const { data: trials } = await supabase
    .from("TrialClass")
    .select("id, name, contact, modality, lessonDate, lessonId, convertedToStudent")
    .eq("convertedToStudent", false)
    .order("lessonDate", { ascending: true })
    .order("createdAt", { ascending: false });

  const filtered = (trials ?? []).filter((t) => {
    if (!t.lessonId) return false;
    return coachLessonIds.has(t.lessonId);
  });

  return (
    <div style={{ maxWidth: "min(600px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/coach"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← {t("back")}
        </Link>
        <h1
          style={{
            margin: "8px 0 0 0",
            fontSize: "clamp(20px, 5vw, 24px)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {t("coachTrialClassesTitle")}
        </h1>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-secondary)",
          }}
        >
          {t("coachTrialClassesDescription")}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {t("coachTrialClassesEmpty")}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(10px, 2.5vw, 12px)",
          }}
        >
          {filtered.map((trial) => {
            const lesson = trial.lessonId ? lessonById.get(trial.lessonId) : null;
            return (
              <li key={trial.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: "clamp(15px, 3.8vw, 17px)",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {trial.name}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {trial.contact}
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {MODALITY_LABELS[trial.modality] ?? trial.modality}
                  {lesson
                    ? ` · ${formatLessonDate(lesson.date)} ${lesson.startTime}–${lesson.endTime}`
                    : ` · ${formatLessonDate(String(trial.lessonDate))}`}
                </p>
                {trial.lessonId && (
                  <Link
                    href={`/coach/aula?lesson=${trial.lessonId}`}
                    style={{
                      display: "inline-block",
                      marginTop: "clamp(8px, 2vw, 12px)",
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      color: "var(--primary)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    {t("coachGoToLesson")} →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
