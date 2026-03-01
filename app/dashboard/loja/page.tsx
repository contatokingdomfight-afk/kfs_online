import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { ComprarCursoButton } from "../biblioteca/ComprarCursoButton";
import { InscreverMeButton } from "../eventos/InscreverMeButton";

const CATEGORY_LABELS: Record<string, string> = {
  TECHNIQUE: "Técnica",
  MINDSET: "Mindset",
  PERFORMANCE: "Performance",
};

const TYPE_LABELS: Record<string, string> = {
  CAMP: "Camp",
  WORKSHOP: "Workshop",
};

const LEVEL_LABELS: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

function formatEventDate(dateStr: string, locale: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function LojaPage() {
  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const studentId = await getCurrentStudentId();
  const today = new Date().toISOString().slice(0, 10);

  const CATEGORY_LABEL: Record<string, string> = {
    TECHNIQUE: t("categoryTechnique"),
    MINDSET: t("categoryMindset"),
    PERFORMANCE: t("categoryPerformance"),
  };

  const [coursesResult, eventsResult, purchasedIds, registeredIds] = await Promise.all([
    supabase
      .from("Course")
      .select("id, name, description, category, modality, level, price, available_for_purchase")
      .eq("is_active", true)
      .eq("available_for_purchase", true)
      .not("price", "is", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("Event")
      .select("id, name, description, type, event_date, price, max_participants")
      .eq("is_active", true)
      .gte("event_date", today)
      .order("event_date", { ascending: true }),
    studentId
      ? supabase.from("CoursePurchase").select("courseId").eq("studentId", studentId)
      : Promise.resolve({ data: [] }),
    studentId
      ? supabase
          .from("EventRegistration")
          .select("eventId")
          .eq("studentId", studentId)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  const courses = coursesResult.data ?? [];
  const events = eventsResult.data ?? [];
  const purchasedCourseIds = new Set((purchasedIds.data ?? []).map((p) => p.courseId));
  const registeredEventIds = new Set(registeredIds.map((r) => r.eventId));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px, 6vw, 32px)" }}>
      <div>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("storeTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("storeDescription")}
        </p>
      </div>

      {courses.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            {t("storeCoursesSection")}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {courses.map((c) => {
              const hasPurchased = purchasedCourseIds.has(c.id);
              return (
                <li key={c.id}>
                  <div
                    className="card"
                    style={{
                      padding: "clamp(14px, 3.5vw, 18px)",
                      opacity: hasPurchased ? 0.9 : 1,
                    }}
                  >
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
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{LEVEL_LABELS[c.level] ?? c.level}</span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--primary)" }}>
                        €{Number(c.price).toFixed(0)}
                      </span>
                    </div>
                    {c.description && (
                      <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                        {c.description.slice(0, 120)}
                        {c.description.length > 120 ? "…" : ""}
                      </p>
                    )}
                    {hasPurchased ? (
                      <p style={{ margin: "8px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500 }}>
                        <Link href={`/dashboard/biblioteca/${c.id}`} style={{ color: "inherit", textDecoration: "underline" }}>
                          {t("storeAlreadyPurchased")} →
                        </Link>
                      </p>
                    ) : (
                      <ComprarCursoButton
                        courseId={c.id}
                        courseName={c.name}
                        price={Number(c.price)}
                        initialLocale={locale as "pt" | "en"}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            {t("storeEventsSection")}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
            {events.map((e) => {
              const isRegistered = registeredEventIds.has(e.id);
              return (
                <li
                  key={e.id}
                  className="card"
                  style={{
                    padding: "clamp(16px, 4vw, 20px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: "clamp(12px, 3vw, 14px)",
                        padding: "2px 8px",
                        background: "var(--surface)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {TYPE_LABELS[e.type] ?? e.type}
                    </span>
                    <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      {formatEventDate(e.event_date, locale)}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--primary)" }}>
                      €{Number(e.price).toFixed(0)}
                    </span>
                  </div>
                  <span style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>{e.name}</span>
                  {e.description && (
                    <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {e.description}
                    </p>
                  )}
                  {isRegistered ? (
                    <p style={{ margin: "8px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500 }}>
                      {t("registered")}
                    </p>
                  ) : (
                    <InscreverMeButton eventId={e.id} eventName={e.name} price={Number(e.price)} initialLocale={locale as "pt" | "en"} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {courses.length === 0 && events.length === 0 && (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>{t("storeEmpty")}</p>
          <p style={{ margin: "12px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
            <Link href="/dashboard/biblioteca" style={{ color: "var(--primary)", textDecoration: "underline" }}>
              {t("libraryTitle")}
            </Link>
            {" · "}
            <Link href="/dashboard/eventos" style={{ color: "var(--primary)", textDecoration: "underline" }}>
              {t("coursesAndEvents")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
