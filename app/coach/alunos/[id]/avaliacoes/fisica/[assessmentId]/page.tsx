import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { PhysicalAssessmentDetailContent } from "@/components/physical-assessment/PhysicalAssessmentDetailContent";

type Props = { params: Promise<{ id: string; assessmentId: string }> };

export default async function CoachAlunoAvaliacaoFisicaDetailPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: studentId, assessmentId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const backHref = `/coach/alunos/${studentId}/avaliacoes`;
  const detailHref = `/coach/alunos/${studentId}/avaliacoes/fisica/${assessmentId}`;
  const editHref = `/coach/alunos/${studentId}/avaliacao-fisica?assessmentId=${assessmentId}&next=${encodeURIComponent(detailHref)}`;

  return (
    <PhysicalAssessmentDetailContent
      supabase={result.client}
      studentId={studentId}
      assessmentId={assessmentId}
      backHref={backHref}
      backLabel="Histórico de avaliações"
      editHref={editHref}
    />
  );
}
