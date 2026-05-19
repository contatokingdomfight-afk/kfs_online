import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCurrentSchoolId } from "@/lib/auth/get-current-school";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  rowsToLessonDefinitions,
} from "@/lib/lesson-occurrences";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";

type SearchParams = Promise<{ coach?: string }>;

export default async function CoachAgendaPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  const supabase = await createClient();
  const schoolAssistant =
    dbUser?.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "COACH" && !schoolAssistant)) redirect("/coach");

  const [coachId, schoolId, locale, params] = await Promise.all([
    getCurrentCoachId(),
    getCurrentSchoolId(),
    getLocaleFromCookies(),
    searchParams,
  ]);
  const t = getTranslations(locale as "pt" | "en");

  const filterCoachId = params.coach ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const inFourWeeks = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Escolas do coach (N:N) ou escola única do contexto (aluno / admin com escola)
  let coachSchoolIds: string[] = [];
  if (coachId) {
    const { data: links } = await supabase.from("CoachSchool").select("schoolId").eq("coachId", coachId);
    coachSchoolIds = (links ?? []).map((l) => l.schoolId);
  }

  let effectiveSchoolId = schoolId;
  if (!effectiveSchoolId && coachSchoolIds.length === 1) {
    effectiveSchoolId = coachSchoolIds[0]!;
  }

  // 1. Definições de aula (sem filtrar por `date` no SQL — recorrentes têm `date` null)
  let allLessonsQuery = supabase
    .from("Lesson")
    .select(
      "id, modality, date, weekday, startTime, endTime, coachId, schoolId, isOneOff, isOpenClass, locationId, capacity, planningNotes"
    )
    .order("startTime", { ascending: true });

  if (coachId && coachSchoolIds.length === 0) {
    allLessonsQuery = allLessonsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  } else if (coachSchoolIds.length > 1) {
    allLessonsQuery = allLessonsQuery.in("schoolId", coachSchoolIds);
  } else if (coachSchoolIds.length === 1) {
    allLessonsQuery = allLessonsQuery.eq("schoolId", coachSchoolIds[0]!);
  } else if (effectiveSchoolId) {
    allLessonsQuery = allLessonsQuery.eq("schoolId", effectiveSchoolId);
  }

  const { data: allLessonsRaw } = await allLessonsQuery;
  const defs = rowsToLessonDefinitions(allLessonsRaw ?? []);
  const lessonIds = defs.map((d) => d.id);
  const cancellations = await fetchLessonCancellations(supabase, lessonIds);
  const fullList = expandLessonsForDateRange(defs, cancellations, today, inFourWeeks);

  // 2. Aplicar filtro: coach em vista ou filtro por professor
  let list = fullList;
  let showAllSchoolHint = false;

  if (filterCoachId) {
    list = fullList.filter((l) => (l as { coachId?: string }).coachId === filterCoachId);
  } else if (coachId) {
    const myLessons = fullList.filter((l) => (l as { coachId?: string }).coachId === coachId);
    if (myLessons.length > 0) {
      list = myLessons;
    } else {
      list = fullList;
      showAllSchoolHint = fullList.length > 0;
    }
  }

  // 3. Lista de coaches para o filtro (professores com aulas no período)
  const coachIds = [...new Set(fullList.map((l) => (l as { coachId?: string }).coachId).filter(Boolean))] as string[];
  let coachesForFilter: { id: string; name: string }[] = [];
  if (coachIds.length > 0) {
    const { data: coaches } = await supabase.from("Coach").select("id, userId").in("id", coachIds);
    const userIds = [...new Set((coaches ?? []).map((c) => c.userId))];
    const { data: users } = await supabase.from("User").select("id, name").in("id", userIds);
    const nameById = new Map((users ?? []).map((u) => [u.id, u.name]));
    coachesForFilter = (coaches ?? []).map((c) => ({
      id: c.id,
      name: nameById.get(c.userId) ?? "Professor",
    })).sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }

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
      {showAllSchoolHint && (
        <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
          {t("agendaNoAssignedHint")}
        </p>
      )}
      {coachesForFilter.length > 1 && (
        <div style={{ marginBottom: "clamp(16px, 4vw, 20px)", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
            {t("agendaFilterByCoach")}:
          </span>
          <Link
            href="/coach/agenda"
            className="btn"
            style={{
              textDecoration: "none",
              backgroundColor: !filterCoachId ? "var(--primary)" : "var(--bg-secondary)",
              color: !filterCoachId ? "#fff" : "var(--text-primary)",
              fontSize: "clamp(13px, 3.2vw, 15px)",
              padding: "6px 12px",
            }}
          >
            {t("agendaFilterAll")}
          </Link>
          {coachesForFilter.map((c) => (
            <Link
              key={c.id}
              href={`/coach/agenda?coach=${c.id}`}
              className="btn"
              style={{
                textDecoration: "none",
                backgroundColor: filterCoachId === c.id ? "var(--primary)" : "var(--bg-secondary)",
                color: filterCoachId === c.id ? "#fff" : "var(--text-primary)",
                fontSize: "clamp(13px, 3.2vw, 15px)",
                padding: "6px 12px",
              }}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {t("noLessons28Days")}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {list.map((lesson) => (
            <li key={lesson.occurrenceKey}>
              <Link
                href={`/coach/aula?lesson=${lesson.id}&date=${encodeURIComponent(lesson.occurrenceDate)}`}
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
                  {MODALITY_LABELS[lesson.modality ?? ""] ?? lesson.modality ?? ""}
                </span>
                <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {formatLessonDate(lesson.occurrenceDate)} · {lesson.startTime}–{lesson.endTime}
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
