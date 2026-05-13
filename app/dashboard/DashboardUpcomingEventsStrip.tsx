import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n";

function formatEventDayShort(iso: string, locale: "pt" | "en"): string {
  try {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

type Row = {
  id: string;
  name: string;
  event_date: string;
  start_date: string | null;
  end_date: string | null;
  price: number | string;
};

type Props = { studentId: string | null; locale: "pt" | "en" };

export async function DashboardUpcomingEventsStrip({ studentId, locale }: Props) {
  const t = getTranslations(locale);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: raw } = await supabase
    .from("Event")
    .select("id, name, event_date, start_date, end_date, price")
    .eq("is_active", true)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(40);

  const rows: Row[] = (raw ?? [])
    .map((row) => {
      const end = ((row as { end_date?: string | null }).end_date ?? row.event_date).slice(0, 10);
      if (end < today) return null;
      return row as unknown as Row;
    })
    .filter(Boolean) as Row[];

  const upcoming = rows.slice(0, 5);
  if (upcoming.length === 0) return null;

  const regIds = new Set<string>();
  if (studentId) {
    const ids = upcoming.map((e) => e.id);
    const { data: regs } = await supabase
      .from("EventRegistration")
      .select("eventId")
      .eq("studentId", studentId)
      .in("eventId", ids)
      .in("status", ["PENDING", "CONFIRMED"]);
    for (const r of regs ?? []) regIds.add((r as { eventId: string }).eventId);
  }

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
      <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("dashboardUpcomingEventsTitle")}
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {upcoming.map((e) => {
          const start = (e.start_date ?? e.event_date).slice(0, 10);
          const dateLabel = formatEventDayShort(start, locale);
          return (
            <li
              key={e.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px 12px",
                justifyContent: "space-between",
                paddingBottom: 8,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Link
                  href="/dashboard/eventos"
                  style={{ fontWeight: 600, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)", textDecoration: "none" }}
                >
                  {e.name}
                </Link>
                {regIds.has(e.id) ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--primary)",
                    }}
                  >
                    {t("registered")}
                  </span>
                ) : null}
              </div>
              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                {dateLabel} · €{Number(e.price).toFixed(0)}
              </span>
            </li>
          );
        })}
      </ul>
      <p style={{ margin: "12px 0 0 0" }}>
        <Link href="/dashboard/eventos" style={{ fontSize: 14, fontWeight: 500, color: "var(--primary)", textDecoration: "none" }}>
          {t("dashboardUpcomingEventsSeeAll")} →
        </Link>
      </p>
    </section>
  );
}
