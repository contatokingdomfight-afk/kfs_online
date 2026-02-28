import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { NovoAtletaForm } from "./NovoAtletaForm";

export const dynamic = "force-dynamic";

export default async function AdminAtletasNovoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: allStudents } = await supabase.from("Student").select("id, userId");
  const { data: existingAthletes } = await supabase.from("Athlete").select("studentId");
  const athleteStudentIds = new Set((existingAthletes ?? []).map((a) => a.studentId));
  const studentsWithoutAthlete = (allStudents ?? []).filter((s) => !athleteStudentIds.has(s.id));

  const userIds = studentsWithoutAthlete.map((s) => s.userId);
  const { data: users } =
    userIds.length > 0 ? await supabase.from("User").select("id, name, email").in("id", userIds) : { data: [] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentOptions = studentsWithoutAthlete.map((s) => ({
    id: s.id,
    label: userById.get(s.userId)?.name || userById.get(s.userId)?.email || s.id,
  }));

  const { data: coaches } = await supabase.from("Coach").select("id, userId");
  const coachUserIds = [...new Set((coaches ?? []).map((c) => c.userId))];
  const { data: coachUsers } =
    coachUserIds.length > 0 ? await supabase.from("User").select("id, name").in("id", coachUserIds) : { data: [] };
  const coachNameById = new Map((coachUsers ?? []).map((u) => [u.id, u.name]));
  const coachOptions = (coaches ?? []).map((c) => ({
    id: c.id,
    name: coachNameById.get(c.userId) ?? c.userId,
  }));

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/atletas"
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
        Novo atleta
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Escolhe um aluno para passar a atleta em acompanhamento e opcionalmente atribui um coach responsável.
      </p>
      <NovoAtletaForm studentOptions={studentOptions} coachOptions={coachOptions} />
    </div>
  );
}
