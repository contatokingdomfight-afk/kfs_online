import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n";
import { fetchCoachUpcomingEvents } from "@/lib/coach-upcoming-events";
import { formatLessonDate } from "@/lib/lesson-utils";

type Props = { locale: "pt" | "en" };

export async function CoachUpcomingEventsCard({ locale }: Props) {
  const t = getTranslations(locale);
  const supabase = await createClient();
  const events = await fetchCoachUpcomingEvents(supabase, 12);
  const upcoming = events.slice(0, 4);
  if (upcoming.length === 0) return null;

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("coachUpcomingEventsTitle")}
        </h2>
        <Link
          href="/coach/eventos"
          style={{ fontSize: 14, fontWeight: 500, color: "var(--primary)", textDecoration: "none" }}
        >
          {t("coachViewEventsCalendar")}
        </Link>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {upcoming.map((e) => {
          const start = (e.start_date ?? e.event_date).slice(0, 10);
          return (
            <li
              key={e.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px 12px",
                paddingBottom: 10,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{e.name}</span>
                <span style={{ display: "block", marginTop: 4, fontSize: 13, color: "var(--text-secondary)" }}>
                  {formatLessonDate(start)}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", flexShrink: 0 }}>
                €{e.price.toFixed(0)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
