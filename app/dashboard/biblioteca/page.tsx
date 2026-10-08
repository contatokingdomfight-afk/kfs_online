import Link from "next/link";
import { BookOpen, Brain, Gauge, Lock, PlayCircle, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { extractYouTubeVideoId } from "@/lib/youtube-embed";
import { BibliotecaFilters } from "./BibliotecaFilters";

import { getCachedPlanAccess } from "@/lib/plan-access";
import { DigitalLibraryAddonBanner } from "./DigitalLibraryAddonBanner";

const LEVEL_LABELS: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

/** Cor e ícone por categoria (capa sem vídeo e etiqueta). */
const CATEGORY_STYLE: Record<string, { fg: string; bg: string; icon: "technique" | "mindset" | "performance" }> = {
  TECHNIQUE: { fg: "#60a5fa", bg: "linear-gradient(135deg, #0c2340 0%, #1e3a5f 100%)", icon: "technique" },
  MINDSET: { fg: "#a78bfa", bg: "linear-gradient(135deg, #1e1b3a 0%, #312e5f 100%)", icon: "mindset" },
  PERFORMANCE: { fg: "#fb923c", bg: "linear-gradient(135deg, #3a1d0a 0%, #5c2d0e 100%)", icon: "performance" },
};

function CategoryIcon({ kind, size }: { kind: "technique" | "mindset" | "performance"; size: number }) {
  if (kind === "mindset") return <Brain size={size} aria-hidden />;
  if (kind === "performance") return <Gauge size={size} aria-hidden />;
  return <Swords size={size} aria-hidden />;
}

type CourseRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  modality: string | null;
  level: string | null;
  included_in_digital_plan: boolean;
  video_url: string | null;
};

type CourseCardData = CourseRow & {
  hasAccess: boolean;
  canOpen: boolean;
  thumbnail: string | null;
  lessonCount: number;
  donePct: number;
};

type Props = { searchParams: Promise<{ cat?: string; mod?: string; lvl?: string; library_addon?: string }> };

export default async function BibliotecaPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const [locale, studentId] = await Promise.all([getLocaleFromCookies(), getCurrentStudentId()]);
  const pt = locale !== "en";
  const t = getTranslations(locale as "pt" | "en");
  const addonBanner = params.library_addon;
  const addonSuccessBanner = addonBanner === "success" ? t("libraryAddonStripeSuccess") : addonBanner === "cancel" ? t("libraryAddonStripeCancel") : null;
  const CATEGORY_LABEL: Record<string, string> = {
    TECHNIQUE: t("categoryTechnique"),
    MINDSET: t("categoryMindset"),
    PERFORMANCE: t("categoryPerformance"),
  };

  let coursesQuery = supabase
    .from("Course")
    .select("id, name, description, category, modality, level, included_in_digital_plan, video_url, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (params.cat) coursesQuery = coursesQuery.eq("category", params.cat);
  if (params.mod) coursesQuery = coursesQuery.eq("modality", params.mod);
  if (params.lvl) coursesQuery = coursesQuery.eq("level", params.lvl);

  const [coursesRes, planAccess, purchasesRes] = await Promise.all([
    coursesQuery,
    getCachedPlanAccess(studentId),
    studentId ? supabase.from("CoursePurchase").select("courseId").eq("studentId", studentId) : Promise.resolve({ data: [] }),
  ]);
  const hasDigitalAccess = planAccess.hasDigitalAccess;
  const canSubscribeLibraryAddon = planAccess.canSubscribeDigitalLibraryAddon;
  const isFreeTierLibrary = Boolean(studentId && !planAccess.currentPlanId);
  const purchasedCourseIds = new Set((purchasesRes.data ?? []).map((p) => p.courseId));
  const list = (coursesRes.data ?? []) as CourseRow[];

  // Módulos e unidades publicados: miniatura (primeiro vídeo do YouTube), nº de aulas e progresso.
  const courseIds = list.map((c) => c.id);
  const { data: modules } =
    courseIds.length > 0
      ? await supabase
          .from("CourseModule")
          .select("id, course_id, video_url, sort_order")
          .in("course_id", courseIds)
          .eq("status", "PUBLISHED")
      : { data: [] as { id: string; course_id: string; video_url: string | null; sort_order: number | null }[] };
  const moduleIds = (modules ?? []).map((m) => m.id);
  const [{ data: units }, { data: unitProgress }, { data: moduleProgress }] = await Promise.all([
    moduleIds.length > 0
      ? supabase.from("CourseUnit").select("id, module_id, video_url, sort_order").in("module_id", moduleIds).eq("status", "PUBLISHED")
      : Promise.resolve({ data: [] as { id: string; module_id: string; video_url: string | null; sort_order: number | null }[] }),
    studentId && moduleIds.length > 0
      ? supabase.from("CourseUnitProgress").select("unit_id").eq("student_id", studentId)
      : Promise.resolve({ data: [] as { unit_id: string }[] }),
    studentId && moduleIds.length > 0
      ? supabase.from("CourseProgress").select("module_id").eq("student_id", studentId)
      : Promise.resolve({ data: [] as { module_id: string }[] }),
  ]);
  const unitsDone = new Set((unitProgress ?? []).map((u) => u.unit_id));
  const modulesDone = new Set((moduleProgress ?? []).map((m) => m.module_id));
  const bySort = (a: { sort_order: number | null }, b: { sort_order: number | null }) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

  const cards: CourseCardData[] = list.map((c) => {
    const mods = (modules ?? []).filter((m) => m.course_id === c.id).sort(bySort);
    const modIds = new Set(mods.map((m) => m.id));
    const courseUnits = (units ?? [])
      .filter((u) => modIds.has(u.module_id))
      .sort((a, b) => {
        const ma = mods.findIndex((m) => m.id === a.module_id);
        const mb = mods.findIndex((m) => m.id === b.module_id);
        return ma === mb ? bySort(a, b) : ma - mb;
      });

    // Aulas = unidades; módulos sem unidades contam como uma aula cada.
    const modulesWithoutUnits = mods.filter((m) => !courseUnits.some((u) => u.module_id === m.id));
    const lessonCount = courseUnits.length + modulesWithoutUnits.length;
    const done = courseUnits.filter((u) => unitsDone.has(u.id)).length + modulesWithoutUnits.filter((m) => modulesDone.has(m.id)).length;
    const donePct = lessonCount > 0 ? Math.round((done / lessonCount) * 100) : 0;

    const firstVideo = [c.video_url, ...mods.map((m) => m.video_url), ...courseUnits.map((u) => u.video_url)].find(
      (v): v is string => Boolean(v && extractYouTubeVideoId(v))
    );
    const videoId = firstVideo ? extractYouTubeVideoId(firstVideo) : null;

    const hasAccess = (c.included_in_digital_plan && hasDigitalAccess) || purchasedCourseIds.has(c.id);
    return {
      ...c,
      hasAccess,
      canOpen: hasAccess || isFreeTierLibrary,
      thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null,
      lessonCount,
      donePct,
    };
  });

  const inProgress = cards.filter((c) => c.hasAccess && c.donePct > 0 && c.donePct < 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
      <div>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, color: "var(--text-primary)" }}>
          {t("libraryTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("libraryDescription")}
        </p>
        <BibliotecaFilters currentCategory={params.cat} currentModality={params.mod} currentLevel={params.lvl} />
      </div>

      {addonSuccessBanner && (
        <div
          role="status"
          className="card"
          style={{
            padding: "clamp(14px, 3.5vw, 18px)",
            borderLeft: "4px solid var(--primary)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
          }}
        >
          {addonSuccessBanner}
        </div>
      )}

      {canSubscribeLibraryAddon && (
        <DigitalLibraryAddonBanner
          locale={locale as "pt" | "en"}
          title={t("libraryAddonTitle")}
          body={t("libraryAddonBody")}
          cta={t("libraryAddonCta")}
          priceHint={t("libraryAddonPriceHint")}
          loading={t("libraryAddonLoading")}
        />
      )}

      {inProgress.length > 0 && (
        <section aria-labelledby="lib-continue" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="lib-continue" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {pt ? "Continuar a ver" : "Continue watching"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 10 }}>
            {inProgress.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/biblioteca/${c.id}`}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, textDecoration: "none", color: "inherit" }}
              >
                <CourseThumb course={c} height={64} width={104} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{c.name}</span>
                  <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden", marginTop: 8 }}>
                    <span style={{ display: "block", width: `${c.donePct}%`, height: "100%", background: "var(--primary)" }} />
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                    {c.donePct}% {pt ? "concluído" : "complete"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cards.length === 0 ? (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
            {t("libraryEmpty")}
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
            gap: "clamp(12px, 3vw, 16px)",
          }}
        >
          {cards.map((c) => {
            const body = (
              <>
                <CourseThumb course={c} height={150} />
                <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>{c.name}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        color: (CATEGORY_STYLE[c.category] ?? CATEGORY_STYLE.TECHNIQUE).fg,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {CATEGORY_LABEL[c.category] ?? c.category}
                    </span>
                    {c.modality && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {MODALITY_LABELS[c.modality] ?? c.modality}
                      </span>
                    )}
                    {c.level && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {LEVEL_LABELS[c.level] ?? c.level}
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {c.description}
                    </p>
                  )}
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                    {c.lessonCount > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <BookOpen size={13} aria-hidden />
                        {c.lessonCount} {pt ? (c.lessonCount === 1 ? "aula" : "aulas") : c.lessonCount === 1 ? "lesson" : "lessons"}
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontWeight: 700, color: c.hasAccess || c.canOpen ? "var(--primary)" : "var(--text-secondary)" }}>
                      {c.hasAccess
                        ? c.donePct >= 100
                          ? pt
                            ? "Concluído ✓"
                            : "Completed ✓"
                          : c.donePct > 0
                            ? `${c.donePct}%`
                            : pt
                              ? "Ver curso"
                              : "View course"
                        : c.canOpen
                          ? t("libraryPreviewBadge")
                          : t("includedInDigitalPlan")}
                    </span>
                  </div>
                  {c.hasAccess && c.donePct > 0 && c.donePct < 100 && (
                    <span style={{ display: "block", height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                      <span style={{ display: "block", width: `${c.donePct}%`, height: "100%", background: "var(--primary)" }} />
                    </span>
                  )}
                </div>
              </>
            );
            const boxStyle: React.CSSProperties = {
              display: "flex",
              flexDirection: "column",
              height: "100%",
              padding: 0,
              overflow: "hidden",
              textDecoration: "none",
              color: "inherit",
            };
            return (
              <li key={c.id}>
                {c.canOpen ? (
                  <Link href={`/dashboard/biblioteca/${c.id}`} className="card" style={boxStyle}>
                    {body}
                  </Link>
                ) : (
                  <div className="card" style={{ ...boxStyle, opacity: 0.9 }}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Capa 16:9: miniatura do primeiro vídeo do YouTube; sem vídeo, gradiente com o ícone da categoria. */
function CourseThumb({ course, height, width }: { course: CourseCardData; height: number; width?: number }) {
  const style = CATEGORY_STYLE[course.category] ?? CATEGORY_STYLE.TECHNIQUE;
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "block",
        flexShrink: 0,
        width: width ?? "100%",
        height,
        borderRadius: width ? 10 : 0,
        overflow: "hidden",
        background: style.bg,
      }}
    >
      {course.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura externa do YouTube, sem otimização
        <img src={course.thumbnail} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: style.fg }}>
          <CategoryIcon kind={style.icon} size={width ? 26 : 40} />
        </span>
      )}
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: course.thumbnail ? "rgba(0,0,0,0.25)" : "transparent",
        }}
      >
        {course.canOpen ? (
          course.thumbnail ? <PlayCircle size={width ? 26 : 44} color="#fff" /> : null
        ) : (
          <span style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(0,0,0,0.6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={18} />
          </span>
        )}
      </span>
    </span>
  );
}
