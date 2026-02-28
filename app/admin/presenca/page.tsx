import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Presente",
  ABSENT: "Falta",
};

export default async function AdminPresencaPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const today = new Date().toISOString().slice(0, 10);
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .gte("date", today)
    .lte("date", inTwoWeeks)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  const list = lessons ?? [];
  const lessonIds = list.map((l) => l.id);
  const { data: attendances } =
    lessonIds.length > 0
      ? await supabase
          .from("Attendance")
          .select("id, lessonId, studentId, status, isExperimental")
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
        Próximas 2 semanas. Para confirmar presenças, usa a área do professor em Entrar na aula.
      </p>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Nenhuma aula nos próximos 14 dias.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
          {list.map((lesson) => {
            const lessonAtts = attList.filter((a) => a.lessonId === lesson.id);
            return (
              <li key={lesson.id} className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: lessonAtts.length ? 12 : 0 }}>
                  <span style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {MODALITY_LABELS[lesson.modality] ?? lesson.modality}
                  </span>
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {formatLessonDate(lesson.date)} · {lesson.startTime}–{lesson.endTime}
                  </span>
                  <Link
                    href={`/coach/aula?lesson=${lesson.id}`}
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
