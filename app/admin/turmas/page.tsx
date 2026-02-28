import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CreateLessonForm } from "./CreateLessonForm";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";

export default async function AdminTurmasPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createClient();

  const { data: lessons, error: lessonsError } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, capacity, coachId, locationId, planningNotes, createdAt")
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  const { data: coaches } = await supabase.from("Coach").select("id, userId").then(async (r) => {
    if (!r.data?.length) return { data: [] as { id: string; name: string }[] };
    const userIds = r.data.map((c) => c.userId);
    const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
    return {
      data: (r.data || []).map((c) => {
        const u = users?.find((u) => u.id === c.userId);
        return { id: c.id, name: u?.name || u?.email || c.id };
      }),
    };
  });

  const { data: locations } = await supabase.from("Location").select("id, name").order("sortOrder", { ascending: true });
  const { data: modalities } = await supabase.from("ModalityRef").select("code, name").order("sortOrder", { ascending: true });

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
          Turmas / Aulas
        </h1>
      </div>

      <section className="card" style={{ marginBottom: "clamp(24px, 6vw, 32px)", padding: "clamp(18px, 4.5vw, 24px)" }}>
        <h2 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Nova aula
        </h2>
        <CreateLessonForm coaches={coaches ?? []} locations={locations ?? []} modalities={modalities ?? []} />
      </section>

      <section>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Aulas
        </h2>
        {lessonsError && (
          <p style={{ color: "var(--danger)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Erro ao carregar: {lessonsError.message}
          </p>
        )}
        {!lessonsError && (!lessons || lessons.length === 0) && (
          <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Nenhuma aula criada. Adiciona acima.
          </p>
        )}
        {!lessonsError && lessons && lessons.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {lessons.map((lesson) => {
              const locationName = (lesson as { locationId?: string }).locationId ? locations?.find((l) => l.id === (lesson as { locationId: string }).locationId)?.name : null;
              const modalityName = (modalities ?? []).find((m) => m.code === lesson.modality)?.name ?? lesson.modality;
              return (
              <li key={lesson.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {modalityName}
                  </span>
                  {locationName && (
                    <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                      · {locationName}
                    </span>
                  )}
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {formatLessonDate(lesson.date)} · {lesson.startTime}–{lesson.endTime}
                  </span>
                  {lesson.capacity != null && (
                    <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                      (cap. {lesson.capacity})
                    </span>
                  )}
                  <Link
                    href={`/admin/turmas/${lesson.id}`}
                    style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none" }}
                  >
                    Editar →
                  </Link>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
