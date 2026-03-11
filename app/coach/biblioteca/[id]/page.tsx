import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { toEmbedVideoUrl } from "@/lib/youtube-embed";

type Props = { params: Promise<{ id: string }> };

export default async function CoachBibliotecaCursoPage({ params }: Props) {
  const { id: courseId } = await params;
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const CATEGORY_LABEL: Record<string, string> = {
    TECHNIQUE: t("categoryTechnique"),
    MINDSET: t("categoryMindset"),
    PERFORMANCE: t("categoryPerformance"),
  };

  const [{ data: course }, { data: modules }] = await Promise.all([
    supabase.from("Course").select("id, name, description, category, modality, video_url, is_active").eq("id", courseId).single(),
    supabase.from("CourseModule").select("id, name, description, video_url, sort_order").eq("course_id", courseId).order("sort_order", { ascending: true }),
  ]);

  const moduleList = modules ?? [];
  const moduleIds = moduleList.map((m) => m.id);
  let unitsByModule = new Map<string, { id: string; name: string; description: string | null; content_type: string; video_url: string | null; text_content: string | null; sort_order: number }[]>();
  if (moduleIds.length > 0) {
    const { data: units } = await supabase
      .from("CourseUnit")
      .select("id, module_id, name, description, content_type, video_url, text_content, sort_order")
      .in("module_id", moduleIds);
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
        <Link href="/coach/biblioteca" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          {t("backToLibrary")}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <div>
        <Link
          href="/coach/biblioteca"
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

      {moduleList.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
          {moduleList.map((mod, idx) => {
            const units = unitsByModule.get(mod.id) ?? [];
            const hasUnits = units.length > 0;
            const isLegacy = !hasUnits && mod.video_url;

            if (hasUnits) {
              return (
                <div key={mod.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h3 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    Módulo {idx + 1}: {mod.name}
                  </h3>
                  {mod.description && (
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>{mod.description}</p>
                  )}
                  {units.map((u, uIdx) => (
                    <div key={u.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                      <div style={{ padding: "clamp(12px, 3vw, 16px)", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {uIdx + 1}. {u.name}
                        </span>
                        {u.description && (
                          <p style={{ margin: "6px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{u.description}</p>
                        )}
                      </div>
                      {u.content_type === "VIDEO" && u.video_url ? (
                        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
                          <iframe
                            src={toEmbedVideoUrl(u.video_url)}
                            title={u.name}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                          />
                        </div>
                      ) : u.content_type === "TEXT" && u.text_content ? (
                        <div
                          style={{
                            padding: "clamp(16px, 4vw, 20px)",
                            fontSize: "clamp(14px, 3.5vw, 16px)",
                            lineHeight: 1.6,
                            color: "var(--text-primary)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {u.text_content}
                        </div>
                      ) : (
                        <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{t("videoComingSoon")}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            }

            if (isLegacy) {
              return (
                <div key={mod.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "clamp(12px, 3vw, 16px)", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {idx + 1}. {mod.name}
                    </span>
                    {mod.description && (
                      <p style={{ margin: "6px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{mod.description}</p>
                    )}
                  </div>
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
                    <iframe
                      src={toEmbedVideoUrl(mod.video_url!)}
                      title={mod.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={mod.id} className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                <h3 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                  Módulo {idx + 1}: {mod.name}
                </h3>
                {mod.description && (
                  <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{mod.description}</p>
                )}
                <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Sem unidades ainda.</p>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {course.video_url ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
                <iframe
                  src={toEmbedVideoUrl(course.video_url)}
                  title={course.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
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
        </>
      )}

      <div style={{ marginTop: 8 }}>
        <Link href="/coach/tema-semana" style={{ fontSize: 14, color: "var(--primary)", textDecoration: "none" }}>
          {t("coachLinkCourseToTheme")} →
        </Link>
      </div>
    </div>
  );
}
