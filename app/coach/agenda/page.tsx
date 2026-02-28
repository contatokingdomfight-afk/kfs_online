import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";

export default async function CoachAgendaPage() {
  const coachId = await getCurrentCoachId();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const inFourWeeks = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let query = supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .gte("date", today)
    .lte("date", inFourWeeks)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  if (coachId) {
    query = query.eq("coachId", coachId);
  }

  const { data: lessons } = await query;

  const list = lessons ?? [];

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
      </div>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("navAgenda")}
      </h1>
      {!coachId && (
        <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("agendaAdminHint")}
        </p>
      )}
      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {t("noLessons28Days")}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {list.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/coach/aula?lesson=${lesson.id}`}
                className="card"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  padding: "clamp(14px, 3.5vw, 18px)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {MODALITY_LABELS[lesson.modality] ?? lesson.modality}
                </span>
                <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {formatLessonDate(lesson.date)} · {lesson.startTime}–{lesson.endTime}
                </span>
                <span style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)" }}>
                  {t("presencesLink")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.length > 0 && (
        <p style={{ marginTop: "clamp(16px, 4vw, 20px)", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          <Link href="/coach/aula/qr" style={{ color: "var(--primary)", textDecoration: "none" }}>
            {t("viewQrForCheckIn")}
          </Link>
        </p>
      )}
    </div>
  );
}
