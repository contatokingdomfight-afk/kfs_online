import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedPlanAccess } from "@/lib/plan-access";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { CourseContentViewer } from "../CourseContentViewer";
import { VideoPlayer } from "@/components/biblioteca/VideoPlayer";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { extractYouTubeVideoId } from "@/lib/youtube-embed";
import { ArrowLeft, BookOpen, FileText, Layers, PlayCircle, Presentation, Brain, Gauge, Swords } from "lucide-react";

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
    supabase.from("Course").select("id, name, description, category, modality, level, included_in_digital_plan, video_url, is_active").eq("id", courseId).single(),
    supabase.from("CourseModule").select("id, name, description, video_url, sort_order").eq("course_id", courseId).eq("status", "PUBLISHED").order("sort_order", { ascending: true }),
    studentId ? supabase.from("CourseProgress").select("module_id").eq("student_id", studentId) : Promise.resolve({ data: [] as { module_id: string }[] }),
    studentId ? supabase.from("CourseUnitProgress").select("unit_id").eq("student_id", studentId) : Promise.resolve({ data: [] as { unit_id: string }[] }),
  ]);

  const completedModuleIds = new Set((progressRows ?? []).map((p) => p.module_id));
  const completedUnitIds = new Set((unitProgressRows ?? []).map((p) => p.unit_id));
  const moduleList = modules ?? [];

  const moduleIds = moduleList.map((m) => m.id);
  let unitsByModule = new Map<string, { id: string; name: string; description: string | null; content_type: string; video_url: string | null; text_content: string | null; pdf_url: string | null; sort_order: number }[]>();
  if (moduleIds.length > 0) {
    const { data: units } = await supabase
      .from("CourseUnit")
      .select("id, module_id, name, description, content_type, video_url, text_content, pdf_url, sort_order")
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

  const pt = locale !== "en";

  // Progresso: unidades concluídas + módulos antigos (só vídeo, sem unidades) concluídos.
  const orderedUnits = moduleList.flatMap((m) =>
    (unitsByModule.get(m.id) ?? []).map((u) => ({ ...u, moduleId: m.id }))
  );
  const legacyModules = moduleList.filter((m) => (unitsByModule.get(m.id) ?? []).length === 0 && m.video_url);
  const totalLessons = orderedUnits.length + legacyModules.length;
  const doneLessons =
    orderedUnits.filter((u) => completedUnitIds.has(u.id)).length +
    legacyModules.filter((m) => completedModuleIds.has(m.id)).length;
  const donePct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;
  const nextUnit = orderedUnits.find((u) => !completedUnitIds.has(u.id)) ?? null;

  const contentTypes = new Set(orderedUnits.map((u) => u.content_type));
  if (legacyModules.length > 0 || course.video_url) contentTypes.add("VIDEO");

  const firstVideo = [course.video_url, ...moduleList.map((m) => m.video_url), ...orderedUnits.map((u) => u.video_url)].find(
    (v): v is string => Boolean(v && extractYouTubeVideoId(v))
  );
  const thumbId = firstVideo ? extractYouTubeVideoId(firstVideo) : null;
  const COVER: Record<string, string> = {
    TECHNIQUE: "linear-gradient(135deg, #0c2340 0%, #1e3a5f 100%)",
    MINDSET: "linear-gradient(135deg, #1e1b3a 0%, #312e5f 100%)",
    PERFORMANCE: "linear-gradient(135deg, #3a1d0a 0%, #5c2d0e 100%)",
  };
  const LEVEL: Record<string, string> = pt
    ? { INICIANTE: "Iniciante", INTERMEDIARIO: "Intermediário", AVANCADO: "Avançado" }
    : { INICIANTE: "Beginner", INTERMEDIARIO: "Intermediate", AVANCADO: "Advanced" };
  const level = (course as { level?: string | null }).level ?? null;
  const CoverIcon = course.category === "MINDSET" ? Brain : course.category === "PERFORMANCE" ? Gauge : Swords;
  const chip: React.CSSProperties = {
    padding: "3px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
  };
  const typeChips = [
    contentTypes.has("VIDEO") && { icon: <PlayCircle size={14} aria-hidden />, label: pt ? "Vídeo" : "Video" },
    contentTypes.has("TEXT") && { icon: <FileText size={14} aria-hidden />, label: pt ? "Texto" : "Text" },
    contentTypes.has("PDF") && { icon: <BookOpen size={14} aria-hidden />, label: "PDF" },
    contentTypes.has("SLIDES") && { icon: <Presentation size={14} aria-hidden />, label: "Slides" },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string }>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)", maxWidth: 820, margin: "0 auto", width: "100%" }}>
      {/* Capa */}
      <section
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          minHeight: 210,
          background: COVER[course.category] ?? COVER.TECHNIQUE,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {thumbId ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura externa do YouTube
          <img
            src={`https://i.ytimg.com/vi/${thumbId}/hqdefault.jpg`}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span aria-hidden style={{ position: "absolute", right: 18, top: 18, color: "rgba(255,255,255,0.18)" }}>
            <CoverIcon size={96} />
          </span>
        )}
        <span aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,11,11,0.25) 0%, rgba(11,11,11,0.9) 75%)" }} />
        <div style={{ position: "relative", padding: 14 }}>
          <Link
            href="/dashboard/biblioteca"
            style={{ ...chip, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", textDecoration: "none", fontWeight: 600 }}
          >
            <ArrowLeft size={14} aria-hidden />
            {t("libraryTitle")}
          </Link>
        </div>
        <div style={{ position: "relative", padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={chip}>{CATEGORY_LABEL[course.category] ?? course.category}</span>
            {course.modality ? <span style={chip}>{MODALITY_LABELS[course.modality] ?? course.modality}</span> : null}
            {level ? <span style={chip}>{LEVEL[level] ?? level}</span> : null}
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 30px)", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{course.name}</h1>
        </div>
      </section>

      {/* Resumo + continuar */}
      {moduleList.length > 0 && (
        <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700 }}>
              <PlayCircle size={18} color="var(--primary)" aria-hidden />
              {totalLessons} {pt ? (totalLessons === 1 ? "aula" : "aulas") : totalLessons === 1 ? "lesson" : "lessons"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700 }}>
              <Layers size={18} color="var(--primary)" aria-hidden />
              {moduleList.length} {pt ? (moduleList.length === 1 ? "módulo" : "módulos") : moduleList.length === 1 ? "module" : "modules"}
            </span>
            {typeChips.map((c) => (
              <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, border: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
                {c.icon}
                {c.label}
              </span>
            ))}
          </div>
          {!lockedPreview && totalLessons > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
                <span>
                  {doneLessons} / {totalLessons} {pt ? "concluídas" : "completed"}
                </span>
                <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>{donePct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ width: `${donePct}%`, height: "100%", background: donePct >= 100 ? "var(--success)" : "var(--primary)" }} />
              </div>
            </div>
          )}
          {!lockedPreview && nextUnit ? (
            <Link
              href={`/dashboard/biblioteca/${courseId}?unit=${nextUnit.id}`}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, textDecoration: "none", fontWeight: 700 }}
            >
              <PlayCircle size={18} aria-hidden />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doneLessons === 0 ? (pt ? "Começar curso" : "Start course") : `${pt ? "Continuar" : "Continue"}: ${nextUnit.name}`}
              </span>
            </Link>
          ) : !lockedPreview && totalLessons > 0 && donePct >= 100 ? (
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--success)" }}>
              {pt ? "Curso concluído — bom trabalho!" : "Course completed — great work!"}
            </p>
          ) : null}
        </section>
      )}

      {course.description && (
        <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>{pt ? "Sobre o curso" : "About the course"}</h2>
          <ExpandableText
            text={course.description.replace(/^\s*sobre o curso\s*[:\-–]?\s*/i, "")}
            lines={4}
            locale={locale as "pt" | "en"}
            style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}
          />
        </section>
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
