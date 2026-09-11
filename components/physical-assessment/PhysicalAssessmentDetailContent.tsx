import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PhysicalAssessmentReadOnlyView } from "@/components/physical-assessment/PhysicalAssessmentReadOnlyView";
import { normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { evaluationHistoryCoachDisplayName } from "@/lib/evaluation-history-helpers";

type Props = {
  supabase: SupabaseClient;
  studentId: string;
  assessmentId: string;
  backHref: string;
  backLabel: string;
};

export async function PhysicalAssessmentDetailContent({
  supabase,
  studentId,
  assessmentId,
  backHref,
  backLabel,
}: Props) {
  const locale = await getLocaleFromCookies();

  const { data: row } = await supabase
    .from("StudentPhysicalAssessment")
    .select("id, studentId, coachId, assessedAt, nextDueAt, clearance, formData, status")
    .eq("id", assessmentId)
    .eq("studentId", studentId)
    .eq("status", "SUBMITTED")
    .maybeSingle();

  if (!row) {
    return (
      <div className="card p-6 max-w-lg">
        <h1 className="text-xl font-bold text-text-primary mb-2">Ficha não encontrada</h1>
        <p className="text-text-secondary mb-4">Esta avaliação física não existe ou ainda está em rascunho.</p>
        <Link href={backHref} className="btn btn-primary inline-block no-underline">
          ← {backLabel}
        </Link>
      </div>
    );
  }

  const [{ data: student }, { data: profile }] = await Promise.all([
    supabase.from("Student").select("userId").eq("id", studentId).single(),
    supabase.from("StudentProfile").select("heightCm, weightKg, dateOfBirth").eq("studentId", studentId).maybeSingle(),
  ]);

  const { data: user } = student?.userId
    ? await supabase.from("User").select("name").eq("id", student.userId).single()
    : { data: null };

  const coachName = row.coachId ? await evaluationHistoryCoachDisplayName(row.coachId as string) : null;
  const studentName = (user?.name as string | null)?.trim() || (locale === "pt" ? "Aluno" : "Student");
  const formData = normalizePhysicalFormDataJson(row.formData) ?? {};

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <Link href={backHref} className="inline-block mb-4 text-sm text-text-secondary hover:text-primary no-underline">
        ← {backLabel}
      </Link>
      <PhysicalAssessmentReadOnlyView
        formData={formData}
        clearance={String(row.clearance ?? "")}
        assessedAt={String(row.assessedAt).slice(0, 10)}
        nextDueAt={row.nextDueAt != null ? String(row.nextDueAt).slice(0, 10) : null}
        coachName={coachName}
        studentName={studentName}
        locale={locale as "pt" | "en"}
        studentDateOfBirth={profile?.dateOfBirth != null ? String(profile.dateOfBirth).slice(0, 10) : null}
        profileBodyMetrics={{
          heightCm: profile?.heightCm != null ? Number(profile.heightCm) : null,
          weightKg: profile?.weightKg != null ? Number(profile.weightKg) : null,
        }}
      />
    </div>
  );
}
