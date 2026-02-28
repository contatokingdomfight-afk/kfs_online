import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";
import { ConvertTrialButton } from "./ConvertTrialButton";

type SearchParams = Promise<{ filter?: string }>;

export default async function AdminExperimentaisPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const filter = params.filter ?? "all"; // all | pending | converted

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: trials } = await supabase
    .from("TrialClass")
    .select("id, name, contact, modality, lessonDate, lessonId, convertedToStudent, createdAt")
    .order("createdAt", { ascending: false });

  const list = trials ?? [];
  let filtered = list;
  if (filter === "pending") filtered = list.filter((t) => !t.convertedToStudent);
  if (filter === "converted") filtered = list.filter((t) => t.convertedToStudent);

  const lessonIds = [...new Set(list.map((t) => t.lessonId).filter(Boolean))] as string[];
  let lessonMap = new Map<string, { modality: string; date: string; startTime: string; endTime: string }>();
  if (lessonIds.length > 0) {
    const { data: lessons } = await supabase
      .from("Lesson")
      .select("id, modality, date, startTime, endTime")
      .in("id", lessonIds);
    lessons?.forEach((l) => {
      lessonMap.set(l.id, {
        modality: MODALITY_LABELS[l.modality] ?? l.modality,
        date: l.date,
        startTime: l.startTime,
        endTime: l.endTime,
      });
    });
  }

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
          Aulas experimentais
        </h1>
        <Link
          href="/admin/experimentais/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Nova inscrição
        </Link>
      </div>

      <div style={{ marginBottom: "clamp(16px, 4vw, 20px)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link
          href="/admin/experimentais"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filter === "all" ? "var(--primary)" : "var(--bg-secondary)",
            color: filter === "all" ? "#fff" : "var(--text-primary)",
          }}
        >
          Todos
        </Link>
        <Link
          href="/admin/experimentais?filter=pending"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filter === "pending" ? "var(--primary)" : "var(--bg-secondary)",
            color: filter === "pending" ? "#fff" : "var(--text-primary)",
          }}
        >
          Pendentes
        </Link>
        <Link
          href="/admin/experimentais?filter=converted"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filter === "converted" ? "var(--primary)" : "var(--bg-secondary)",
            color: filter === "converted" ? "#fff" : "var(--text-primary)",
          }}
        >
          Convertidos
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {list.length === 0
            ? "Ainda não há inscrições em aulas experimentais."
            : "Nenhuma inscrição com este filtro."}
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
          {filtered.map((t) => {
            const lesson = t.lessonId ? lessonMap.get(t.lessonId) : null;
            return (
              <li key={t.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {t.name}
                  </span>
                  <span
                    style={{
                      fontSize: "clamp(12px, 3vw, 14px)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: t.convertedToStudent ? "var(--success)" : "var(--warning)",
                      color: t.convertedToStudent ? "#fff" : "var(--text-primary)",
                    }}
                  >
                    {t.convertedToStudent ? "Convertido" : "Pendente"}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {t.contact}
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {MODALITY_LABELS[t.modality] ?? t.modality}
                  {lesson
                    ? ` · ${formatLessonDate(lesson.date)} ${lesson.startTime}–${lesson.endTime}`
                    : ` · ${formatLessonDate(String(t.lessonDate))}`}
                </p>
                {!t.convertedToStudent && t.contact.includes("@") && (
                  <ConvertTrialButton trialId={t.id} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
