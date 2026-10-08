import Link from "next/link";
import { CalendarDays, ChevronRight, Gift, ShoppingBag, Users } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { countActiveEventRegistrations } from "@/lib/event-registration-counts";

const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

function monthDay(ymd: string, pt: boolean): { m: string; d: string } {
  const [y, mo, d] = ymd.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return {
    m: date.toLocaleDateString(pt ? "pt-PT" : "en-GB", { month: "short", timeZone: "UTC" }).replace(".", "").toUpperCase(),
    d: String(d).padStart(2, "0"),
  };
}

/**
 * Resumo no topo da Tribo: quantos colegas vão treinar hoje (só o número — não expõe quem),
 * os próximos eventos e atalhos para Loja/Benefícios.
 */
export async function TribeHighlights({
  schoolId,
  studentId,
  hasExclusiveBenefits,
  locale,
}: {
  schoolId: string;
  studentId: string;
  hasExclusiveBenefits: boolean;
  locale: "pt" | "en";
}) {
  const pt = locale === "pt";
  const today = calendarDateLisbon(new Date());
  const admin = getAdminClientOrNull().client;
  const supabase = await createClient();

  // Colegas da escola com «Vou» (PENDING) ou check-in (CONFIRMED) numa aula de hoje.
  let goingToday = 0;
  if (admin) {
    const { data: att } = await admin
      .from("Attendance")
      .select("studentId, lessonId")
      .eq("occurrenceDate", today)
      .in("status", ["PENDING", "CONFIRMED"]);
    const lessonIds = [...new Set((att ?? []).map((a) => a.lessonId as string))];
    if (lessonIds.length > 0) {
      const { data: schoolLessons } = await admin.from("Lesson").select("id").in("id", lessonIds).eq("schoolId", schoolId);
      const ok = new Set((schoolLessons ?? []).map((l) => l.id as string));
      goingToday = new Set(
        (att ?? []).filter((a) => ok.has(a.lessonId as string) && a.studentId !== studentId).map((a) => a.studentId as string)
      ).size;
    }
  }

  const { data: rawEvents } = await supabase
    .from("Event")
    .select("id, name, event_date, start_date, end_date, start_time")
    .eq("is_active", true)
    .order("start_date", { ascending: true, nullsFirst: false });
  const events = (rawEvents ?? [])
    .filter((e) => (((e as { end_date?: string | null }).end_date ?? e.event_date) as string).slice(0, 10) >= today)
    .slice(0, 2) as Array<{ id: string; name: string; event_date: string; start_date: string | null; start_time: string | null }>;
  const counts = await countActiveEventRegistrations(events.map((e) => e.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 22, backgroundColor: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Users size={22} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>
            {goingToday > 0
              ? pt
                ? `${goingToday} ${goingToday === 1 ? "colega vai" : "colegas vão"} treinar hoje`
                : `${goingToday} ${goingToday === 1 ? "teammate is" : "teammates are"} training today`
              : pt
                ? "Sê o primeiro a confirmar hoje"
                : "Be the first to confirm today"}
          </span>
          <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            {pt ? "Marca «Vou» na tua próxima aula" : "Tap «Going» on your next class"}
          </span>
        </span>
        <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", textDecoration: "none", whiteSpace: "nowrap" }}>
          {pt ? "Ver aulas" : "Classes"}
        </Link>
      </div>

      {events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{pt ? "Próximos eventos" : "Upcoming events"}</span>
            <Link href="/dashboard/eventos" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
              {pt ? "Ver todos" : "See all"}
            </Link>
          </div>
          {events.map((e) => {
            const md = monthDay(e.start_date ?? e.event_date, pt);
            const n = counts[e.id] ?? 0;
            return (
              <Link
                key={e.id}
                href="/dashboard/eventos"
                style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
              >
                <span aria-hidden style={{ width: 48, height: 52, flexShrink: 0, borderRadius: 12, backgroundColor: "#fff", color: "#0b0b0b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#c1121f" }}>{md.m}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{md.d}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    {e.start_time ? `${e.start_time.slice(0, 5)} · ` : ""}
                    {n > 0 ? `${n} ${pt ? (n === 1 ? "inscrito" : "inscritos") : n === 1 ? "registered" : "registered"}` : pt ? "Inscrições abertas" : "Registration open"}
                  </span>
                </span>
                <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: hasExclusiveBenefits ? "repeat(2, minmax(0, 1fr))" : "repeat(1, minmax(0, 1fr))", gap: 8 }}>
        <Link href="/dashboard/loja" style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <ShoppingBag size={20} color="var(--primary)" aria-hidden />
          <span style={{ fontSize: 14, fontWeight: 700 }}>{pt ? "Loja" : "Store"}</span>
        </Link>
        {hasExclusiveBenefits && (
          <Link href="/dashboard/beneficios" style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <Gift size={20} color="#facc15" aria-hidden />
            <span style={{ fontSize: 14, fontWeight: 700 }}>{pt ? "Benefícios" : "Benefits"}</span>
          </Link>
        )}
      </div>

      {events.length === 0 && (
        <Link href="/dashboard/eventos" style={{ ...card, padding: 12, display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <CalendarDays size={20} color="var(--text-secondary)" aria-hidden />
          <span style={{ flex: 1, fontSize: 14 }}>{pt ? "Sem eventos marcados por agora" : "No events scheduled for now"}</span>
          <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
        </Link>
      )}
    </div>
  );
}
