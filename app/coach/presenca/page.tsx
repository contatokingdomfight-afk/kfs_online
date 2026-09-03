import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";
import { PresencaLessonList, type PresencaLessonItem } from "@/components/attendance/PresencaLessonList";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  rowsToLessonDefinitions,
} from "@/lib/lesson-occurrences";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Presente",
  ABSENT: "Falta",
};

const WINDOW_DAYS = 14;

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function formatYmdPt(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

type SearchParams = Promise<{ start?: string }>;

export default async function CoachPresencaPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const adminResult = getAdminClientOrNull();
  const supabase = adminResult.client ?? (await createClient());
  const today = new Date().toISOString().slice(0, 10);
  const params = await searchParams;
  const rangeStart = params.start && /^\d{4}-\d{2}-\d{2}$/.test(params.start) ? params.start : today;
  const rangeEnd = addDaysYmd(rangeStart, WINDOW_DAYS);
  const prevStart = addDaysYmd(rangeStart, -WINDOW_DAYS);
  const nextStart = addDaysYmd(rangeStart, WINDOW_DAYS);

  const { data: lessonsRaw } = await supabase
    .from("Lesson")
    .select(
      "id, modality, date, weekday, startTime, endTime, schoolId, isOneOff, coachId, isOpenClass, locationId, capacity, planningNotes"
    )
    .order("startTime", { ascending: true });

  const defs = rowsToLessonDefinitions(lessonsRaw ?? []);
  const cancellations = await fetchLessonCancellations(
    supabase,
    defs.map((d) => d.id)
  );
  const list = expandLessonsForDateRange(defs, cancellations, rangeStart, rangeEnd);
  const lessonIds = [...new Set(list.map((l) => l.id))];
  const { data: attendances } =
    lessonIds.length > 0
      ? await supabase
          .from("Attendance")
          .select("id, lessonId, studentId, status, isExperimental, occurrenceDate")
          .in("lessonId", lessonIds)
          .order("createdAt", { ascending: true })
      : { data: [] };

  const attList = attendances ?? [];
  const studentIds = [...new Set(attList.map((a) => a.studentId))];
  const { data: usersData } =
    studentIds.length > 0
      ? await supabase
          .from("Student")
          .select("id, userId")
          .in("id", studentIds)
          .then(async (r) => {
            if (!r.data?.length) return { data: [] as { id: string; name: string | null; email: string }[] };
            const uids = [...new Set(r.data.map((s) => s.userId))];
            const { data: users } = await supabase.from("User").select("id, name, email").in("id", uids);
            const userMap = new Map((users ?? []).map((u) => [u.id, u]));
            return {
              data: r.data.map((s) => {
                const u = userMap.get(s.userId);
                return { id: s.id, name: u?.name ?? null, email: u?.email ?? "" };
              }),
            };
          })
      : { data: [] };

  const studentToUser = new Map(usersData.map((s) => [s.id, s]));

  const byStudentName = (a: { studentId: string }, b: { studentId: string }) => {
    const nameA = (studentToUser.get(a.studentId)?.name || studentToUser.get(a.studentId)?.email || "").toLowerCase();
    const nameB = (studentToUser.get(b.studentId)?.name || studentToUser.get(b.studentId)?.email || "").toLowerCase();
    return nameA.localeCompare(nameB, "pt");
  };

  const presencaLessons: PresencaLessonItem[] = list.map((lesson) => {
    const lessonAtts = attList
      .filter((a) => {
        if (a.lessonId !== lesson.id) return false;
        const occ =
          typeof (a as { occurrenceDate?: string | null }).occurrenceDate === "string"
            ? (a as { occurrenceDate: string }).occurrenceDate.slice(0, 10)
            : "";
        return occ === lesson.occurrenceDate;
      })
      .sort(byStudentName);
    return {
      key: lesson.occurrenceKey,
      modalityLabel: MODALITY_LABELS[lesson.modality ?? ""] ?? lesson.modality ?? "",
      dateLabel: formatLessonDate(lesson.occurrenceDate),
      timeLabel: `${lesson.startTime}–${lesson.endTime}`,
      manageHref:
        lesson.occurrenceDate >= today
          ? `/coach/aula?lesson=${lesson.id}&date=${encodeURIComponent(lesson.occurrenceDate)}`
          : null,
      attendees: lessonAtts.map((a) => {
        const u = studentToUser.get(a.studentId);
        return {
          id: a.id,
          name: u?.name || u?.email || "—",
          isExperimental: Boolean(a.isExperimental),
          status: a.status,
        };
      }),
    };
  });

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/coach"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Presença
        </h1>
      </div>

      <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Clica numa aula para ver quem esteve presente. Para gerir presenças de aulas de hoje em diante, usa
        Ver/confirmar dentro do detalhe. Navega para trás para ver o histórico de aulas passadas.
      </p>

      <div style={{ marginBottom: "clamp(16px, 4vw, 20px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <Link
          href={`/coach/presenca?start=${prevStart}`}
          className="btn btn-secondary"
          style={{ textDecoration: "none", fontSize: "clamp(13px, 3.2vw, 15px)" }}
        >
          ← Anteriores
        </Link>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {formatYmdPt(rangeStart)} – {formatYmdPt(addDaysYmd(rangeEnd, -1))}
        </span>
        <Link
          href={`/coach/presenca?start=${nextStart}`}
          className="btn btn-secondary"
          style={{ textDecoration: "none", fontSize: "clamp(13px, 3.2vw, 15px)" }}
        >
          Seguintes →
        </Link>
        {rangeStart !== today && (
          <Link href="/coach/presenca" style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none" }}>
            Hoje
          </Link>
        )}
      </div>

      {presencaLessons.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Nenhuma aula neste período.
        </p>
      ) : (
        <PresencaLessonList lessons={presencaLessons} statusLabel={STATUS_LABEL} />
      )}
    </div>
  );
}
