import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
import { AnatomicalBodyMap } from "@/components/physical-assessment/AnatomicalBodyMap";
import { BodyMapSkeletonInvite } from "@/components/physical-assessment/BodyMapSkeletonInvite";
import { PhysicalAssessmentReadOnlyView } from "@/components/physical-assessment/PhysicalAssessmentReadOnlyView";
import { RequestPhysicalAssessmentPanel } from "@/components/physical-assessment/RequestPhysicalAssessmentPanel";
import { PhysicalAssessmentEvolution } from "@/components/physical-assessment/PhysicalAssessmentEvolution";

export const dynamic = "force-dynamic";

export default async function DashboardFichaFisicaPage() {
  await requirePlan();
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/dashboard");

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");

  const painSince = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: physRows }, { data: student }, { data: profile }, { data: pendingRequestRow }, { data: painRows }, { data: injuryRows }] = await Promise.all([
    supabase
      .from("StudentPhysicalAssessment")
      .select("assessedAt, nextDueAt, clearance, formData, coachId, editedAt, editedByUserId")
      .eq("studentId", studentId)
      .eq("status", "SUBMITTED")
      .order("assessedAt", { ascending: true }),
    supabase.from("Student").select("userId").eq("id", studentId).single(),
    supabase.from("StudentProfile").select("heightCm, weightKg, dateOfBirth").eq("studentId", studentId).maybeSingle(),
    supabase
      .from("PhysicalAssessmentRequest")
      .select("id")
      .eq("studentId", studentId)
      .eq("status", "PENDING")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("PainSelfReport")
      .select("bodyRegion, intensity, reportedAt, side")
      .eq("studentId", studentId)
      .gte("reportedAt", painSince)
      .order("reportedAt", { ascending: false })
      .limit(30),
    supabase
      .from("StudentInjury")
      .select("bodyRegion, side, injuryType, occurredYear, recovered")
      .eq("studentId", studentId)
      .order("createdAt", { ascending: false })
      .limit(30),
  ]);
  const bodyMapInjuries = (injuryRows ?? []) as Array<{ bodyRegion: string; side: string | null; injuryType: string; occurredYear: number | null; recovered: boolean }>;
  const bodyMapPains = ((painRows ?? []) as Array<{ bodyRegion: string; intensity: number; reportedAt: string; side: string | null }>).map((p) => ({
    bodyRegion: String(p.bodyRegion),
    intensity: Number(p.intensity),
    reportedAt: String(p.reportedAt),
    side: p.side,
  }));

  const hasPendingPhysicalRequest = Boolean(pendingRequestRow?.id);

  const allRows = physRows ?? [];
  const row = allRows.length > 0 ? allRows[allRows.length - 1] : null;
  const evolutionRows = allRows.map((r) => ({
    assessedAt: String(r.assessedAt).slice(0, 10),
    nextDueAt: r.nextDueAt != null ? String(r.nextDueAt).slice(0, 10) : null,
    formData: normalizePhysicalFormDataJson(r.formData) ?? {},
  }));
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

  let editedByName: string | null = null;
  if (row?.editedByUserId) {
    const { data: editorUser } = await supabase.from("User").select("name").eq("id", row.editedByUserId).maybeSingle();
    editedByName = (editorUser?.name as string | null) ?? null;
  }

  if (!row) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10 xl:gap-12">
          <header className="space-y-2 lg:col-span-7 lg:col-start-6 lg:row-start-1">
            <h1 className="m-0 text-xl font-bold text-[var(--text-primary)] sm:text-2xl lg:text-[1.65rem] lg:leading-snug">
              {t("fichaFisicaEmptyTitle")}
            </h1>
            <p className="m-0 max-w-prose text-[15px] leading-relaxed text-[var(--text-secondary)] sm:text-base">
              {t("fichaFisicaEmptyBody")}
            </p>
          </header>
          <aside className="lg:col-span-5 lg:col-start-1 lg:row-span-3 lg:row-start-1">
            <div className="mx-auto flex max-w-md flex-col gap-3 lg:sticky lg:top-6 lg:mx-0 lg:max-w-none lg:self-start">
              <AnatomicalBodyMap
                generic
                formData={{}}
                locale={locale as "pt" | "en"}
                pains={bodyMapPains}
                studentInjuries={bodyMapInjuries}
                scheduleHref="/dashboard/perfil"
                profileBodyMetrics={{
                  heightCm: profile?.heightCm != null ? Number(profile.heightCm) : null,
                  weightKg: profile?.weightKg != null ? Number(profile.weightKg) : null,
                }}
              />
              <BodyMapSkeletonInvite locale={locale as "pt" | "en"} scheduleHref="/dashboard/perfil" className="shadow-sm" />
            </div>
          </aside>
          <div className="lg:col-span-7 lg:col-start-6 lg:row-start-2">
            <RequestPhysicalAssessmentPanel locale={locale as "pt" | "en"} initialPending={hasPendingPhysicalRequest} />
          </div>
          <div className="flex flex-wrap gap-3 pt-1 lg:col-span-7 lg:col-start-6 lg:row-start-3">
            <Link href="/dashboard/perfil" className="btn btn-secondary no-underline">
              {t("fichaFisicaLinkPerfil")}
            </Link>
            <Link href="/dashboard/performance" className="btn btn-primary no-underline">
              {t("fichaFisicaBackPerformance")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formData = normalizePhysicalFormDataJson(row.formData) ?? {};
  const assessedAt = String(row.assessedAt).slice(0, 10);
  const nextDueAt = row.nextDueAt != null ? String(row.nextDueAt).slice(0, 10) : null;
  const clearance = String(row.clearance ?? "");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-2 sm:px-6 lg:max-w-4xl lg:px-8 lg:pb-14">
      <div className="flex flex-wrap items-center gap-3 pb-4 pt-2">
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
        studentDateOfBirth={profile?.dateOfBirth != null ? String(profile.dateOfBirth).slice(0, 10) : null}
        profileBodyMetrics={{
          heightCm: profile?.heightCm != null ? Number(profile.heightCm) : null,
          weightKg: profile?.weightKg != null ? Number(profile.weightKg) : null,
        }}
        editedAt={row.editedAt ? String(row.editedAt) : null}
        editedByName={editedByName}
        bodyMapPains={bodyMapPains}
        bodyMapInjuries={bodyMapInjuries}
      />
      {profile?.heightCm != null || profile?.weightKg != null ? (
        <p className="mx-auto mt-4 max-w-2xl px-0 text-xs text-[var(--text-secondary)] sm:px-1">{t("fichaFisicaProfileHint")}</p>
      ) : null}
      {evolutionRows.length >= 1 ? (
        <div className="mt-8">
          <PhysicalAssessmentEvolution rows={evolutionRows} locale={locale as "pt" | "en"} />
        </div>
      ) : null}
      <section className="mt-10 border-t border-[var(--border)] pt-8 lg:mt-12 lg:pt-10">
        <RequestPhysicalAssessmentPanel locale={locale as "pt" | "en"} initialPending={hasPendingPhysicalRequest} />
      </section>
    </div>
  );
}
