import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedPlanAccess } from "@/lib/plan-access";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { CourseContentViewer } from "../CourseContentViewer";
import { VideoPlayer } from "@/components/biblioteca/VideoPlayer";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ unit?: string }> };

export default async function CursoDetailPage({ params, searchParams }: Props) {
  const { id: courseId } = await params;
  const { unit: initialOpenUnitId } = await searchParams;
  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const CATEGORY_LABEL: Record<string, string> = {
    TECHNIQUE: t("categoryTechnique"),
    MINDSET: t("categoryMindset"),
    PERFORMANCE: t("categoryPerformance"),
  };
  const studentId = await getCurrentStudentId();
  const planAccess = await getCachedPlanAccess(studentId);
  const hasDigitalAccess = planAccess.hasDigitalAccess;
  const planId = planAccess.currentPlanId;
  let hasPurchased = false;
  if (studentId) {
    const { data: purchase } = await supabase
      .from("CoursePurchase")
      .select("id")
      .eq("studentId", studentId)
      .eq("courseId", courseId)
      .maybeSingle();
    hasPurchased = !!purchase;
  }

  const [{ data: course }, { data: modules }, { data: progressRows }, { data: unitProgressRows }] = await Promise.all([
    supabase.from("Course").select("id, name, description, category, modality, included_in_digital_plan, video_url, is_active").eq("id", courseId).single(),
    supabase.from("CourseModule").select("id, name, description, video_url, sort_order").eq("course_id", courseId).eq("status", "PUBLISHED").order("sort_order", { ascending: true }),
    studentId ? supabase.from("CourseProgress").select("module_id").eq("student_id", studentId) : Promise.resolve({ data: [] as { module_id: string }[] }),
    studentId ? supabase.from("CourseUnitProgress").select("unit_id").eq("student_id", studentId) : Promise.resolve({ data: [] as { unit_id: string }[] }),
  ]);

  const completedModuleIds = new Set((progressRows ?? []).map((p) => p.module_id));
  const completedUnitIds = new Set((unitProgressRows ?? []).map((p) => p.unit_id));
  const moduleList = modules ?? [];

  const moduleIds = moduleList.map((m) => m.id);
  let unitsByModule = new Map<string, { id: string; name: string; description: string | null; content_type: string; video_url: string | null; text_content: string | null; sort_order: number }[]>();
  if (moduleIds.length > 0) {
    const { data: units } = await supabase
      .from("CourseUnit")
      .select("id, module_id, name, description, content_type, video_url, text_content, sort_order")
      .in("module_id", moduleIds)
      .eq("status", "PUBLISHED");
    (units ?? []).forEach((u) => {
      const list = unitsByModule.get(u.module_id) ?? [];
      list.push(u);
      unitsByModule.set(u.module_id, list);
    });
    unitsByModule.forEach((list) => list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
  }

  if (!course || !course.is_active) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>{t("courseNotFound")}</p>
        <Link href="/dashboard/biblioteca" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          {t("backToLibrary")}
        </Link>
      </div>
    );
  }

  const hasAccess = (course.included_in_digital_plan && hasDigitalAccess) || hasPurchased;
  const isFreeTierPreview = Boolean(studentId && !planId && !hasPurchased);
  if (!hasAccess && !isFreeTierPreview) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          {t("courseNoAccess")}
        </p>
        <Link href="/dashboard/biblioteca" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          {t("backToLibrary")}
        </Link>
      </div>
    );
  }

  const lockedPreview = isFreeTierPreview;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <div>
        <Link
          href="/dashboard/biblioteca"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            textDecoration: "none",
            marginBottom: 8,
            display: "inline-block",
          }}
        >
          ← {t("libraryTitle")}
        </Link>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {course.name}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {CATEGORY_LABEL[course.category] ?? course.category}
          {course.modality && ` · ${MODALITY_LABELS[course.modality] ?? course.modality}`}
        </p>
      </div>

      {course.description && (
        <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
          <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)", lineHeight: 1.5 }}>
            {course.description}
          </p>
        </div>
      )}

      {lockedPreview && (
        <div
          className="card"
          style={{
            padding: "clamp(14px, 3.5vw, 18px)",
            borderLeft: "4px solid var(--primary)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
          }}
        >
          <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>{t("freeTierCourseLockedTitle")}</p>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>{t("freeTierCourseLockedBody")}</p>
          <Link href="/escolher-plano" className="btn btn-primary" style={{ marginTop: 12, textDecoration: "none", display: "inline-flex" }}>
            {t("freeTierCtaButton")}
          </Link>
        </div>
      )}
      {moduleList.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
          {!lockedPreview &&
            (() => {
              const totalUnits = [...unitsByModule.values()].reduce((s, list) => s + list.length, 0);
              const completedUnits = [...unitsByModule.values()].reduce(
                (s, list) => s + list.filter((u) => completedUnitIds.has(u.id)).length,
                0
              );
              const legacyModules = moduleList.filter((m) => (unitsByModule.get(m.id) ?? []).length === 0 && m.video_url);
              const completedLegacy = legacyModules.filter((m) => completedModuleIds.has(m.id)).length;
              const totalForProgress = totalUnits + legacyModules.length;
              const completedForProgress = completedUnits + completedLegacy;
              return (
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
                  {completedForProgress} / {totalForProgress} itens concluídos
                </p>
              );
            })()}
          <CourseContentViewer
            courseId={courseId}
            moduleList={moduleList}
            unitsByModule={Object.fromEntries(unitsByModule)}
            completedUnitIds={[...completedUnitIds]}
            completedModuleIds={[...completedModuleIds]}
            studentId={lockedPreview ? null : studentId}
            initialOpenUnitId={initialOpenUnitId ?? null}
            videoComingSoon={t("videoComingSoon")}
            completePreviousUnit={t("completePreviousUnit")}
            videoUnavailable={t("videoUnavailable")}
            lockedPreview={lockedPreview}
            lockedOverlayTitle={t("freeTierCourseLockedTitle")}
            lockedOverlayBody={t("freeTierCourseLockedBody")}
            choosePlanLabel={t("freeTierCtaButton")}
          />
        </div>
      ) : (
        <>
          {course.video_url ? (
            <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              {lockedPreview ? (
                <div
                  style={{
                    minHeight: 220,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: 24,
                    background: "var(--surface)",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600, textAlign: "center" }}>{t("freeTierCourseLockedTitle")}</p>
                  <p style={{ margin: 0, color: "var(--text-secondary)", textAlign: "center", fontSize: 14 }}>
                    {t("freeTierCourseLockedBody")}
                  </p>
                  <Link href="/escolher-plano" className="btn btn-primary" style={{ textDecoration: "none" }}>
                    {t("freeTierCtaButton")}
                  </Link>
                </div>
              ) : (
                <VideoPlayer
                  url={course.video_url}
                  title={course.name}
                  fallbackMessage={t("videoUnavailable")}
                  autoLandscapeOnMobile={false}
                />
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
                {t("videoComingSoon")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
