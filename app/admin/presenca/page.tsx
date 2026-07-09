import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
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

export default async function AdminPresencaPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const adminResult = getAdminClientOrNull();
  const supabase = adminResult.client ?? (await createClient());
  const today = new Date().toISOString().slice(0, 10);
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
  const list = expandLessonsForDateRange(defs, cancellations, today, inTwoWeeks);
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

  const attendanceCsvRows = list.flatMap((lesson) => {
    const lessonAtts = attList.filter((a) => {
      if (a.lessonId !== lesson.id) return false;
      const occ =
        typeof (a as { occurrenceDate?: string | null }).occurrenceDate === "string"
          ? (a as { occurrenceDate: string }).occurrenceDate.slice(0, 10)
          : "";
      return occ === lesson.occurrenceDate;
    });
    return lessonAtts.map((a) => {
      const u = studentToUser.get(a.studentId);
      return {
        aluno: u?.name || u?.email || "",
        aula: MODALITY_LABELS[lesson.modality ?? ""] ?? lesson.modality ?? "",
        data: formatLessonDate(lesson.occurrenceDate),
        horario: `${lesson.startTime}–${lesson.endTime}`,
        estado: STATUS_LABEL[a.status] ?? a.status,
      };
    });
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
          href="/admin"
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

      <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Próximas 2 semanas. Para confirmar presenças, usa a área do professor em Check-in de aula.
      </p>

      <div style={{ marginBottom: 16 }}>
        <ExportCsvButton rows={attendanceCsvRows} filename="presencas-kfs.csv" />
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Nenhuma aula nos próximos 14 dias.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
          {list.map((lesson) => {
            const lessonAtts = attList.filter((a) => {
              if (a.lessonId !== lesson.id) return false;
              const occ =
                typeof (a as { occurrenceDate?: string | null }).occurrenceDate === "string"
                  ? (a as { occurrenceDate: string }).occurrenceDate.slice(0, 10)
                  : "";
              return occ === lesson.occurrenceDate;
            });
            return (
              <li key={lesson.occurrenceKey} className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: lessonAtts.length ? 12 : 0 }}>
                  <span style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {MODALITY_LABELS[lesson.modality ?? ""] ?? lesson.modality ?? ""}
                  </span>
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {formatLessonDate(lesson.occurrenceDate)} · {lesson.startTime}–{lesson.endTime}
                  </span>
                  <Link
                    href={`/coach/aula?lesson=${lesson.id}&date=${encodeURIComponent(lesson.occurrenceDate)}`}
                    style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none", marginLeft: "auto" }}
                  >
                    Ver/confirmar →
                  </Link>
                </div>
                {lessonAtts.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    Ninguém marcou presença ainda.
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {lessonAtts.map((a) => {
                      const u = studentToUser.get(a.studentId);
                      return (
                        <li
                          key={a.id}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 8,
                            fontSize: "clamp(14px, 3.5vw, 16px)",
                          }}
                        >
                          <span style={{ color: "var(--text-primary)" }}>{u?.name || u?.email || "—"}</span>
                          {a.isExperimental && (
                            <span style={{ fontSize: 12, padding: "2px 6px", backgroundColor: "var(--warning)", borderRadius: 4, color: "var(--text-primary)" }}>
                              Exp.
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 12,
                              padding: "2px 8px",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: a.status === "CONFIRMED" ? "var(--success)" : a.status === "ABSENT" ? "var(--danger)" : "var(--bg)",
                              color: a.status === "CONFIRMED" || a.status === "ABSENT" ? "#fff" : "var(--text-secondary)",
                            }}
                          >
                            {STATUS_LABEL[a.status] ?? a.status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
