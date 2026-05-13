import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { requirePlan } from "@/lib/require-plan";
import { EventosBoard, type DashboardEventRow } from "./EventosBoard";

export default async function EventosPage() {
  await requirePlan();
  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const studentId = await getCurrentStudentId();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rawEvents } = await supabase
    .from("Event")
    .select(
      "id, name, description, type, event_date, start_date, end_date, start_time, end_time, location, banner_url, price, max_participants"
    )
    .eq("is_active", true)
    .order("start_date", { ascending: true, nullsFirst: false });

  const events: DashboardEventRow[] = (rawEvents ?? [])
    .map((row) => {
      const end = ((row as { end_date?: string | null }).end_date ?? row.event_date).slice(0, 10);
      if (end < today) return null;
      return row as unknown as DashboardEventRow;
    })
    .filter(Boolean) as DashboardEventRow[];

  let registeredIds: string[] = [];
  if (studentId && events.length > 0) {
    const eventIds = events.map((e) => e.id);
    const { data: regs } = await supabase
      .from("EventRegistration")
      .select("eventId")
      .eq("studentId", studentId)
      .in("eventId", eventIds);
    registeredIds = (regs ?? []).map((r) => r.eventId as string);
  }

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

      <EventosBoard events={events} locale={locale as "pt" | "en"} registeredIds={registeredIds} />
    </div>
  );
}
