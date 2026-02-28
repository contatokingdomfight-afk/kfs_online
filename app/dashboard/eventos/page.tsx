import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { InscreverMeButton } from "./InscreverMeButton";

const TYPE_LABELS: Record<string, string> = {
  CAMP: "Camp",
  WORKSHOP: "Workshop",
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

export default async function EventosPage() {
  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const studentId = await getCurrentStudentId();
  const today = new Date().toISOString().slice(0, 10);

  const { data: events } = await supabase
    .from("Event")
    .select("id, name, description, type, event_date, price, max_participants")
    .eq("is_active", true)
    .gte("event_date", today)
    .order("event_date", { ascending: true });

  let myRegistrationIds = new Set<string>();
  if (studentId && (events?.length ?? 0) > 0) {
    const eventIds = (events ?? []).map((e) => e.id);
    const { data: regs } = await supabase
      .from("EventRegistration")
      .select("eventId")
      .eq("studentId", studentId)
      .in("eventId", eventIds);
    myRegistrationIds = new Set((regs ?? []).map((r) => r.eventId));
  }

  const list = events ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <div>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("coursesAndEvents")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("eventsDescription")}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
            {t("eventsEmpty")}
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
          {list.map((e) => {
            const isRegistered = myRegistrationIds.has(e.id);
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
                <span style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {e.name}
                </span>
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
      )}
    </div>
  );
}
