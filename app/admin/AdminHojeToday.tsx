import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChevronRight } from "lucide-react";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { fetchExpandedLessonsInRange } from "@/lib/admin-dashboard-stats";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

/** «Hoje nas aulas»: aulas do dia com quantos vão (Vou) e quantos já fizeram check-in. */
export async function AdminHojeToday({ client, schoolId }: { client: SupabaseClient; schoolId: string | null }) {
  const today = calendarDateLisbon(new Date());
  const nowHm = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit", hour12: false });
  const lessons = (await fetchExpandedLessonsInRange(client, today, today, schoolId)).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  if (lessons.length === 0) return null;

  const ids = [...new Set(lessons.map((l) => l.id))];
  const [{ data: att }, { data: trials }] = await Promise.all([
    client.from("Attendance").select("lessonId, status").in("lessonId", ids).eq("occurrenceDate", today).in("status", ["PENDING", "CONFIRMED"]),
    client.from("TrialClass").select("lessonId").in("lessonId", ids).eq("lessonDate", today),
  ]);
  const going = new Map<string, number>();
  const present = new Map<string, number>();
  for (const a of (att ?? []) as { lessonId: string; status: string }[]) {
    going.set(a.lessonId, (going.get(a.lessonId) ?? 0) + 1);
    if (a.status === "CONFIRMED") present.set(a.lessonId, (present.get(a.lessonId) ?? 0) + 1);
  }
  const trialCount = new Map<string, number>();
  for (const t of (trials ?? []) as { lessonId: string | null }[]) if (t.lessonId) trialCount.set(t.lessonId, (trialCount.get(t.lessonId) ?? 0) + 1);

  return (
    <section aria-labelledby="hoje-aulas" className="card" style={{ padding: 0, overflow: "hidden" }}>
      <h2 id="hoje-aulas" style={{ margin: 0, padding: "14px 16px", fontSize: 17, fontWeight: 800, borderBottom: "1px solid var(--border)" }}>
        Hoje nas aulas
      </h2>
      {lessons.map((l, i) => {
        const start = String(l.startTime).slice(0, 5);
        const past = String(l.endTime ?? "").slice(0, 5) < nowHm;
        const g = going.get(l.id) ?? 0;
        const p = present.get(l.id) ?? 0;
        const tr = trialCount.get(l.id) ?? 0;
        return (
          <Link
            key={l.occurrenceKey}
            href={`/coach/aula?lesson=${encodeURIComponent(l.id)}&date=${today}`}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i > 0 ? "1px solid var(--border)" : "none", textDecoration: "none", color: "var(--text-primary)", opacity: past ? 0.6 : 1 }}
          >
            <span style={{ minWidth: 46, fontSize: 15, fontWeight: 800 }}>{start}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{l.modality ? MODALITY_LABELS[l.modality] ?? l.modality : "Aula"}</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              {past || p > 0 ? `${p} presentes` : `${g} ${g === 1 ? "vai" : "vão"}`}
              {tr > 0 ? ` · ${tr} exp.` : ""}
            </span>
            <ChevronRight size={16} aria-hidden style={{ color: "var(--text-secondary)" }} />
          </Link>
        );
      })}
    </section>
  );
}
