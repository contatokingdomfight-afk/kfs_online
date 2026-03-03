import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { formatLessonDate } from "@/lib/lesson-utils";
import { EditarAulaForm } from "./EditarAulaForm";
import { CancelarAulaButton } from "./CancelarAulaButton";
import { getCachedLocations, getCachedModalityRefs } from "@/lib/cached-reference-data";

type Props = { params: Promise<{ id: string }> };

export default async function AdminTurmaEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: lessonId } = await params;
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, coachId, locationId, capacity, planningNotes, isOneOff")
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Aula não encontrada.</p>
        <Link href="/admin/turmas" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const { data: coaches } = await supabase.from("Coach").select("id, userId");
  const userIds = [...new Set((coaches ?? []).map((c) => c.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const coachOptions = (coaches ?? []).map((c) => ({
    id: c.id,
    name: userById.get(c.userId)?.name ?? userById.get(c.userId)?.email ?? c.id,
  }));

  const [locationOptions, modalityOptions] = await Promise.all([
    getCachedLocations(supabase),
    getCachedModalityRefs(supabase),
  ]);
  const modalityName = modalityOptions.find((m) => m.code === lesson.modality)?.name ?? lesson.modality;

  const dateStr = typeof lesson.date === "string" ? lesson.date.slice(0, 10) : lesson.date;

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/turmas"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Editar aula
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {modalityName} · {formatLessonDate(dateStr)} {lesson.startTime}–{lesson.endTime}
        {(lesson as { isOneOff?: boolean }).isOneOff && (
          <span style={{ marginLeft: 8, fontSize: 12, padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
            Aula única
          </span>
        )}
      </p>
      <EditarAulaForm
        lessonId={lessonId}
        initialModality={lesson.modality}
        initialDate={dateStr}
        initialStartTime={lesson.startTime}
        initialEndTime={lesson.endTime}
        initialCoachId={lesson.coachId}
        initialLocationId={(lesson as { locationId?: string }).locationId ?? ""}
        initialCapacity={lesson.capacity ?? ""}
        initialPlanningNotes={lesson.planningNotes ?? ""}
        coachOptions={coachOptions}
        locationOptions={locationOptions ?? []}
        modalityOptions={modalityOptions ?? []}
      />
      <CancelarAulaButton lessonId={lessonId} />
    </div>
  );
}
