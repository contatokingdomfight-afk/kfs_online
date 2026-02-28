import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";
import { NovaExperimentalForm } from "./NovaExperimentalForm";

export default async function AdminExperimentaisNovoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const today = new Date().toISOString().slice(0, 10);

  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true })
    .limit(50);

  const lessonOptions = (lessons ?? []).map((l) => ({
    id: l.id,
    label: `${MODALITY_LABELS[l.modality] ?? l.modality} · ${formatLessonDate(l.date)} ${l.startTime}–${l.endTime}`,
  }));

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/experimentais"
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
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Nova inscrição experimental
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Regista alguém que queira fazer uma aula experimental. Podes associar a uma aula existente ou apenas à data e modalidade.
      </p>
      <NovaExperimentalForm lessonOptions={lessonOptions} />
    </div>
  );
}
