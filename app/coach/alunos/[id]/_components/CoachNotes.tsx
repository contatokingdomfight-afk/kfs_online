import { getAdminClientOrNull } from "@/lib/supabase/admin";

type Props = { studentId: string };

export async function CoachNotes({ studentId }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
  if (!athlete) {
    return (
      <section
        className="card"
        style={{
          marginTop: "clamp(16px, 4vw, 20px)",
          padding: "clamp(20px, 5vw, 24px)",
          borderLeft: "4px solid var(--border)",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Comentário do treinador
        </h2>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          Ainda não há comentários do treinador para este aluno.
        </p>
      </section>
    );
  }

  const { data: latestComment } = await supabase
    .from("Comment")
    .select("content, authorCoachId")
    .eq("targetType", "ATHLETE")
    .eq("targetId", athlete.id)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestComment?.content) {
    return (
      <section
        className="card"
        style={{
          marginTop: "clamp(16px, 4vw, 20px)",
          padding: "clamp(20px, 5vw, 24px)",
          borderLeft: "4px solid var(--border)",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Comentário do treinador
        </h2>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          Ainda não há comentários do treinador para este aluno.
        </p>
      </section>
    );
  }

  let coachName = "Treinador";
  if (latestComment.authorCoachId) {
    const { data: coach } = await supabase.from("Coach").select("userId").eq("id", latestComment.authorCoachId).single();
    if (coach) {
      const { data: user } = await supabase.from("User").select("name").eq("id", coach.userId).single();
      coachName = user?.name ?? coachName;
    }
  }

  return (
    <section
      className="card"
      style={{
        marginTop: "clamp(16px, 4vw, 20px)",
        padding: "clamp(20px, 5vw, 24px)",
        borderLeft: "4px solid var(--primary)",
      }}
    >
      <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Comentário do treinador
      </h2>
      <p style={{ margin: "0 0 8px 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)", fontWeight: 500 }}>
        {coachName}
      </p>
      <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
        {latestComment.content}
      </p>
    </section>
  );
}
