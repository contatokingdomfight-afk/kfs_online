import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

type WellnessZone = "GREEN" | "YELLOW" | "RED";

function zoneLabel(z: WellnessZone): { short: string; className: string } {
  if (z === "GREEN") return { short: "Verde", className: "coach-wellness-zone--green" };
  if (z === "YELLOW") return { short: "Amarelo", className: "coach-wellness-zone--yellow" };
  return { short: "Vermelho", className: "coach-wellness-zone--red" };
}

type Props = { studentId: string };

/** Pré-treino e RPE recentes (leitura para o coach). */
export async function CoachStudentWellbeingSection({ studentId }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const [{ data: wellnessRows }, { data: rpeRows }] = await Promise.all([
    supabase
      .from("PreLessonWellness")
      .select(
        "id, occurrenceDate, lessonId, wellnessZone, sleepHours, sleepQuality, hydrationOk, stress, fatigue, createdAt"
      )
      .eq("studentId", studentId)
      .order("createdAt", { ascending: false })
      .limit(10),
    supabase
      .from("Attendance")
      .select("id, occurrenceDate, lessonId, rpe, rpeRecordedAt")
      .eq("studentId", studentId)
      .not("rpe", "is", null)
      .order("rpeRecordedAt", { ascending: false })
      .limit(10),
  ]);

  const wList = (wellnessRows ?? []) as Array<{
    id: string;
    occurrenceDate: string;
    lessonId: string;
    wellnessZone: WellnessZone;
    sleepHours: number;
    sleepQuality: number;
    hydrationOk: boolean;
    stress: number;
    fatigue: number;
  }>;

  const rList = (rpeRows ?? []) as Array<{
    id: string;
    occurrenceDate: string;
    lessonId: string;
    rpe: number;
    rpeRecordedAt: string | null;
  }>;

  const lessonIds = [...new Set([...wList.map((w) => w.lessonId), ...rList.map((r) => r.lessonId)])];
  const { data: lessons } =
    lessonIds.length > 0
      ? await supabase.from("Lesson").select("id, modality").in("id", lessonIds)
      : { data: [] as { id: string; modality: string }[] };

  const modByLesson = new Map((lessons ?? []).map((l) => [l.id, l.modality]));

  if (wList.length === 0 && rList.length === 0) {
    return (
      <section style={{ marginTop: "clamp(24px, 6vw, 32px)" }} aria-labelledby="coach-wellbeing-heading">
        <h2
          id="coach-wellbeing-heading"
          style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}
        >
          Bem-estar e carga
        </h2>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          Ainda não há registos de pré-treino nem RPE na plataforma.
        </p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: "clamp(24px, 6vw, 32px)" }} aria-labelledby="coach-wellbeing-heading">
      <h2
        id="coach-wellbeing-heading"
        style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}
      >
        Bem-estar e carga
      </h2>
      <p style={{ margin: "0 0 16px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Registos feitos pelo aluno (check-in e pós-treino). Útil para ajustar intensidade e recuperação.
      </p>

      {wList.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
            Pré-treino (recentes)
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {wList.map((w) => {
              const mod = modByLesson.get(w.lessonId) ?? "";
              const z = zoneLabel(w.wellnessZone);
              const dateStr = String(w.occurrenceDate).slice(0, 10);
              const title = `Sono ${w.sleepHours}h · qualidade ${w.sleepQuality}/5 · hidratação ${w.hydrationOk ? "ok" : "baixa"} · stress ${w.stress}/5 · fadiga ${w.fatigue}/5`;
              return (
                <li
                  key={w.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "clamp(13px, 3.2vw, 15px)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{dateStr}</span>
                  {mod ? ` · ${MODALITY_LABELS[mod] ?? mod}` : ""}
                  <span className={`coach-wellness-zone-pill ${z.className}`} style={{ marginLeft: 8 }} title={title}>
                    {z.short}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {rList.length > 0 && (
        <div>
          <h3 style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
            RPE pós-treino (recentes)
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rList.map((r) => {
              const mod = modByLesson.get(r.lessonId) ?? "";
              const dateStr = String(r.occurrenceDate).slice(0, 10);
              return (
                <li
                  key={r.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "clamp(13px, 3.2vw, 15px)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>RPE {r.rpe}</strong>
                  {mod ? ` · ${MODALITY_LABELS[mod] ?? mod}` : ""} · {dateStr}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
