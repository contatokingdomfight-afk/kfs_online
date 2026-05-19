import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { formatLessonDate } from "@/lib/lesson-utils";

export default async function CoachEventosCheckInPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const supabase = await createClient();
  const assistant =
    dbUser.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  if (!assistant) redirect("/coach");

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const today = new Date().toISOString().slice(0, 10);

  const admin = createAdminClient();
  const { data: studs } = await admin.from("Student").select("id").eq("schoolId", assistant.schoolId);
  const sidList = (studs ?? []).map((s) => s.id).filter(Boolean);
  let eventRows: { id: string; name: string; start_date: string | null; end_date: string | null; event_date: string | null }[] = [];

  if (sidList.length > 0) {
    const { data: regs } = await admin
      .from("EventRegistration")
      .select("eventId")
      .eq("status", "CONFIRMED")
      .in("studentId", sidList);
    const eids = [...new Set((regs ?? []).map((r) => (r as { eventId: string }).eventId).filter(Boolean))];
    if (eids.length > 0) {
      const { data: evs } = await admin
        .from("Event")
        .select("id, name, event_date, start_date, end_date, is_active")
        .in("id", eids)
        .eq("is_active", true)
        .order("start_date", { ascending: true, nullsFirst: false });
      eventRows = (evs ?? [])
        .map((row) => {
          const end = ((row as { end_date?: string | null }).end_date ?? row.event_date ?? "").slice(0, 10);
          if (end < today) return null;
          return row as (typeof eventRows)[0];
        })
        .filter(Boolean) as typeof eventRows;
    }
  }

  return (
    <div style={{ maxWidth: "min(560px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/coach" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}>
        ← {t("navHome")}
      </Link>
      <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {t("navEventsSchoolCheckIn")}
      </h1>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {locale === "pt"
          ? "Só aparecem eventos com inscrições confirmadas de alunos da tua escola. O check-in manual e o QR só listam ou validam esses participantes."
          : "Only events with confirmed registrations from students at your school are listed. Manual check-in and QR only cover those participants."}
      </p>

      {eventRows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)" }}>
          {locale === "pt" ? "Nenhum evento com participantes da tua escola neste momento." : "No events with participants from your school right now."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {eventRows.map((ev) => {
            const start = (ev.start_date ?? ev.event_date ?? "").slice(0, 10);
            const dateLabel = start ? formatLessonDate(start) : "—";
            return (
              <li key={ev.id}>
                <Link
                  href={`/coach/eventos/${ev.id}/validar`}
                  className="card"
                  style={{
                    display: "block",
                    padding: "14px 16px",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{ev.name}</span>
                  <span style={{ display: "block", marginTop: 6, fontSize: 14, color: "var(--text-secondary)" }}>{dateLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
