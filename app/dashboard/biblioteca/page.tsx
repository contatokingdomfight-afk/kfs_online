import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { BibliotecaFilters } from "./BibliotecaFilters";

import { getCachedPlanAccess } from "@/lib/plan-access";
import { DigitalLibraryAddonBanner } from "./DigitalLibraryAddonBanner";

const LEVEL_LABELS: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

type Props = { searchParams: Promise<{ cat?: string; mod?: string; lvl?: string; library_addon?: string }> };

export default async function BibliotecaPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const [locale, studentId] = await Promise.all([getLocaleFromCookies(), getCurrentStudentId()]);
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
  const courses = coursesRes.data;

  const list = courses ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <div>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
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

      {list.length === 0 ? (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
            {t("libraryEmpty")}
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {list.map((c) => {
            const hasAccessByPlan = c.included_in_digital_plan && hasDigitalAccess;
            const hasAccessByPurchase = purchasedCourseIds.has(c.id);
            const hasAccess = hasAccessByPlan || hasAccessByPurchase;
            const canOpenCourse = hasAccess || isFreeTierLibrary;
            const cardContent = (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {c.name}
                  </span>
                  <span
                    style={{
                      fontSize: "clamp(12px, 3vw, 14px)",
                      padding: "2px 8px",
                      background: "var(--surface)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {CATEGORY_LABEL[c.category] ?? c.category}
                  </span>
                  {c.modality && (
                    <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                      {MODALITY_LABELS[c.modality] ?? c.modality}
                    </span>
                  )}
                  {c.level && (
                    <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                      {LEVEL_LABELS[c.level] ?? c.level}
                    </span>
                  )}
                  {hasAccess ? (
                    <span style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)" }}>
                      Ver curso →
                    </span>
                  ) : canOpenCourse ? (
                    <span style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)" }}>
                      {t("libraryPreviewBadge")} →
                    </span>
                  ) : (
                    <span style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                      {t("includedInDigitalPlan")}
                    </span>
                  )}
                </div>
                {c.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {c.description.slice(0, 120)}
                    {c.description.length > 120 ? "…" : ""}
                  </p>
                )}
              </>
            );
            return (
              <li key={c.id}>
                {canOpenCourse ? (
                  <Link
                    href={`/dashboard/biblioteca/${c.id}`}
                    className="card"
                    style={{
                      display: "block",
                      padding: "clamp(14px, 3.5vw, 18px)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <div
                    className="card"
                    style={{
                      padding: "clamp(14px, 3.5vw, 18px)",
                      opacity: 0.9,
                    }}
                  >
                    {cardContent}
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
