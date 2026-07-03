import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { SchoolAssistantBadge } from "@/components/SchoolAssistantBadge";
import { AlunoTabs } from "./AlunoTabs";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INADIMPLENTE: "Inadimplente",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function CoachAlunoLayout({ children, params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, status, planId, primaryModality")
    .eq("id", studentId)
    .single();

  if (!student) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Aluno não encontrado.</p>
        <Link href="/coach/alunos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  const [{ data: user }, planRes, { data: assistRow }] = await Promise.all([
    supabase.from("User").select("email").eq("id", student.userId).single(),
    student.planId ? supabase.from("Plan").select("name").eq("id", student.planId).single() : Promise.resolve({ data: null }),
    supabase.from("SchoolAssistantCoach").select("id, revokedAt").eq("studentId", studentId).maybeSingle(),
  ]);

  const planName = planRes.data?.name ?? null;
  const primaryModality = (student as { primaryModality?: string | null }).primaryModality;
  const assistantActive = Boolean(assistRow?.id && assistRow.revokedAt == null);

  return (
    <div>
      <div style={{ maxWidth: "min(720px, 100%)" }}>
        <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
          <Link
            href="/coach/alunos"
            style={{
              color: "var(--text-secondary)",
              fontSize: "clamp(15px, 3.8vw, 17px)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            ← Voltar à lista
          </Link>
        </div>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Perfil do aluno
        </h1>
        <p style={{ margin: "0 0 4px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {user?.email}
        </p>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span
            style={{
              fontSize: "clamp(12px, 3vw, 14px)",
              padding: "4px 10px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-primary)",
            }}
          >
            {STATUS_LABEL[student.status] ?? student.status}
          </span>
          {planName && (
            <span
              style={{
                fontSize: "clamp(12px, 3vw, 14px)",
                padding: "4px 10px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            >
              {planName}
            </span>
          )}
          {primaryModality && (
            <span
              style={{
                fontSize: "clamp(12px, 3vw, 14px)",
                padding: "4px 10px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            >
              {MODALITY_LABELS[primaryModality] ?? primaryModality}
            </span>
          )}
          <SchoolAssistantBadge active={assistantActive} />
        </div>

        <AlunoTabs studentId={studentId} />
      </div>
      {children}
    </div>
  );
}
