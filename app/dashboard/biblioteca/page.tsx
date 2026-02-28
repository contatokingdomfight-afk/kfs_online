import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { ComprarCursoButton } from "./ComprarCursoButton";

export default async function BibliotecaPage() {
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
  }

  const { data: courses } = await supabase
    .from("Course")
    .select("id, name, description, category, modality, included_in_digital_plan, video_url, sort_order, price, available_for_purchase")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  let purchasedCourseIds = new Set<string>();
  if (studentId) {
    const { data: purchases } = await supabase
      .from("CoursePurchase")
      .select("courseId")
      .eq("studentId", studentId);
    purchasedCourseIds = new Set((purchases ?? []).map((p) => p.courseId));
  }

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
      </div>

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
            const canPurchase = !hasAccess && c.available_for_purchase && c.price != null && Number(c.price) > 0;
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
                  {hasAccess ? (
                    <span style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)" }}>
                      Ver curso →
                    </span>
                  ) : canPurchase ? (
                    <span style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)" }}>
                      €{Number(c.price).toFixed(0)} · Comprar
                    </span>
                  ) : (
                    <span style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                      Incluído em planos com acesso digital
                    </span>
                  )}
                </div>
                {c.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {c.description.slice(0, 120)}
                    {c.description.length > 120 ? "…" : ""}
                  </p>
                )}
                {canPurchase && (
                  <ComprarCursoButton
                    courseId={c.id}
                    courseName={c.name}
                    price={Number(c.price)}
                    initialLocale={locale as "pt" | "en"}
                  />
                )}
              </>
            );
            return (
              <li key={c.id}>
                {hasAccess ? (
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
