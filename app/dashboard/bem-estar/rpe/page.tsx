import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { RpeQuickForm } from "./RpeQuickForm";

export const metadata = {
  title: "RPE pós-treino | KFS",
};

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function RpePage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const from = ymdDaysAgo(14);

  const { data: rows } = await supabase
    .from("Attendance")
    .select("id, occurrenceDate, lessonId")
    .eq("studentId", studentId)
    .eq("status", "CONFIRMED")
    .is("rpe", null)
    .gte("occurrenceDate", from)
    .order("occurrenceDate", { ascending: false });

  const att = (rows ?? []) as Array<{ id: string; occurrenceDate: string; lessonId: string }>;
  const lessonIds = [...new Set(att.map((a) => a.lessonId))];
  const { data: lessons } = await supabase.from("Lesson").select("id, modality").in("id", lessonIds);
  const modByLesson = new Map((lessons ?? []).map((l) => [l.id as string, l.modality as string]));

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <p style={{ marginBottom: 8 }}>
        <Link href="/dashboard/bem-estar" style={{ color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
          ← Bem-estar
        </Link>
      </p>
      <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", marginBottom: 8, color: "var(--text-primary)" }}>
        Esforço percebido (RPE)
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
        Após o treino, classifica o esforço de 1 (muito leve) a 10 (máximo). Usa as aulas recentes abaixo.
      </p>

      {att.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>Não há aulas em falta de RPE nos últimos 14 dias.</p>
      ) : (
        att.map((a) => {
          const mod = modByLesson.get(a.lessonId) ?? "";
          const modalityLabel = MODALITY_LABELS[mod] ?? mod;
          const occ = String(a.occurrenceDate).slice(0, 10);
          return (
            <RpeQuickForm
              key={a.id}
              attendanceId={a.id}
              modalityLabel={modalityLabel}
              occurrenceDate={occ}
              saveLabel="Guardar RPE"
            />
          );
        })
      )}
    </div>
  );
}
