import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

/** Converte URL do YouTube (watch ou short) em URL de embed para iframe. */
function toEmbedVideoUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
  } catch {
    // fallback: devolver original
  }
  return url;
}

type Props = { params: Promise<{ id: string }> };

export default async function CursoDetailPage({ params }: Props) {
  const { id: courseId } = await params;
  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const CATEGORY_LABEL: Record<string, string> = {
    TECHNIQUE: t("categoryTechnique"),
    MINDSET: t("categoryMindset"),
    PERFORMANCE: t("categoryPerformance"),
  };
  const studentId = await getCurrentStudentId();

  let hasDigitalAccess = false;
  let hasPurchased = false;
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("planId").eq("id", studentId).single();
    if (student?.planId) {
      const { data: plan } = await supabase
        .from("Plan")
        .select("includes_digital_access")
        .eq("id", student.planId)
        .eq("is_active", true)
        .single();
      hasDigitalAccess = plan?.includes_digital_access === true;
    }
    const { data: purchase } = await supabase
      .from("CoursePurchase")
      .select("id")
      .eq("studentId", studentId)
      .eq("courseId", courseId)
      .maybeSingle();
    hasPurchased = !!purchase;
  }

  const { data: course } = await supabase
    .from("Course")
    .select("id, name, description, category, modality, included_in_digital_plan, video_url, is_active")
    .eq("id", courseId)
    .single();

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
  if (!hasAccess) {
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

      {course.video_url ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
            <iframe
              src={toEmbedVideoUrl(course.video_url)}
              title={course.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            {t("videoComingSoon")}
          </p>
        </div>
      )}
    </div>
  );
}
