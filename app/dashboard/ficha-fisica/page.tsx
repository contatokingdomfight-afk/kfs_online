import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
import { BodyMapSkeletonInvite } from "@/components/physical-assessment/BodyMapSkeletonInvite";
import { PhysicalAssessmentReadOnlyView } from "@/components/physical-assessment/PhysicalAssessmentReadOnlyView";

export const dynamic = "force-dynamic";

export default async function DashboardFichaFisicaPage() {
  await requirePlan();
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/dashboard");

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const [{ data: physRows }, { data: student }, { data: profile }] = await Promise.all([
    supabase
      .from("StudentPhysicalAssessment")
      .select("assessedAt, nextDueAt, clearance, formData, coachId")
      .eq("studentId", studentId)
      .order("assessedAt", { ascending: false })
      .limit(1),
    supabase.from("Student").select("userId").eq("id", studentId).single(),
    supabase.from("StudentProfile").select("heightCm, weightKg").eq("studentId", studentId).maybeSingle(),
  ]);

  const row = physRows?.[0] ?? null;
  const { data: user } = student?.userId
    ? await supabase.from("User").select("name").eq("id", student.userId).single()
    : { data: null };

  let coachName: string | null = null;
  if (row?.coachId) {
    const { data: coach } = await supabase.from("Coach").select("userId").eq("id", row.coachId).single();
    if (coach?.userId) {
      const { data: coachUser } = await supabase.from("User").select("name").eq("id", coach.userId).single();
      coachName = (coachUser?.name as string | null) ?? null;
    }
  }

  const studentName = (user?.name as string | null)?.trim() || (locale === "pt" ? "Aluno" : "Student");

  if (!row) {
    return (
      <div className="max-w-[min(640px,100%)] mx-auto space-y-4 p-4 pb-12">
        <h1 className="text-xl font-bold text-[var(--text-primary)] m-0">{t("fichaFisicaEmptyTitle")}</h1>
        <p className="text-[var(--text-secondary)] m-0">{t("fichaFisicaEmptyBody")}</p>
        <BodyMapSkeletonInvite locale={locale as "pt" | "en"} scheduleHref="/dashboard/performance" className="max-w-md" />
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/dashboard/perfil" className="btn btn-secondary no-underline">
            {t("fichaFisicaLinkPerfil")}
          </Link>
          <Link href="/dashboard/performance" className="btn btn-primary no-underline">
            {t("fichaFisicaBackPerformance")}
          </Link>
        </div>
      </div>
    );
  }

  const formData = normalizePhysicalFormDataJson(row.formData) ?? {};
  const assessedAt = String(row.assessedAt).slice(0, 10);
  const nextDueAt = row.nextDueAt != null ? String(row.nextDueAt).slice(0, 10) : null;
  const clearance = String(row.clearance ?? "");

  return (
    <div className="max-w-[min(720px,100%)] mx-auto pb-8">
      <div className="px-4 pt-2 pb-4 flex flex-wrap gap-3 items-center">
        <Link href="/dashboard/performance" className="text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] no-underline">
          ← {t("fichaFisicaBackPerformance")}
        </Link>
      </div>
      <PhysicalAssessmentReadOnlyView
        formData={formData}
        clearance={clearance}
        assessedAt={assessedAt}
        nextDueAt={nextDueAt}
        coachName={coachName}
        studentName={studentName}
        locale={locale as "pt" | "en"}
        profileBodyMetrics={{
          heightCm: profile?.heightCm != null ? Number(profile.heightCm) : null,
          weightKg: profile?.weightKg != null ? Number(profile.weightKg) : null,
        }}
      />
      {profile?.heightCm != null || profile?.weightKg != null ? (
        <p className="text-xs text-[var(--text-secondary)] px-4 mt-4 max-w-2xl mx-auto">{t("fichaFisicaProfileHint")}</p>
      ) : null}
    </div>
  );
}
