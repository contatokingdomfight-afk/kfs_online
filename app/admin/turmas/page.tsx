import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CreateLessonForm } from "./CreateLessonForm";
import { TurmasViewSwitcher } from "./TurmasViewSwitcher";
import {
  MODALITY_LABELS,
  formatLessonDate,
  getWeekStartMonday,
  getWeekEndSunday,
  getWeekdayName,
} from "@/lib/lesson-utils";
import { getCachedLocations, getCachedModalityRefs } from "@/lib/cached-reference-data";

type LessonRow = {
  id: string;
  modality: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  coachId: string | null;
  locationId: string | null;
  planningNotes: string | null;
  isOneOff?: boolean;
  createdAt?: string;
};

export default async function AdminTurmasPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string }>;
}) {
  const params = await searchParams;
  const view = (params.view === "semana" ? "semana" : "modalidade") as "modalidade" | "semana";
  const weekParam = params.week?.trim() || null;
  const weekMonday =
    view === "semana"
      ? (() => {
          if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) return weekParam;
          return getWeekStartMonday();
        })()
      : null;
  const weekEnd = weekMonday ? getWeekEndSunday(weekMonday) : null;
  const weekMondayForLink = weekMonday ?? (view === "semana" ? getWeekStartMonday() : getWeekStartMonday());
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createClient();

  const { data: lessons, error: lessonsError } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, capacity, coachId, locationId, planningNotes, isOneOff, createdAt")
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  const { data: coaches } = await supabase.from("Coach").select("id, userId").then(async (r) => {
    if (!r.data?.length) return { data: [] as { id: string; name: string }[] };
    const userIds = r.data.map((c) => c.userId);
    const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
    return {
      data: (r.data || []).map((c) => {
        const u = users?.find((u) => u.id === c.userId);
        return { id: c.id, name: u?.name || u?.email || c.id };
      }),
    };
  });

  const [locations, modalities] = await Promise.all([
    getCachedLocations(supabase),
    getCachedModalityRefs(supabase),
  ]);
  const { data: schools } = await supabase.from("School").select("id, name").eq("isActive", true).order("name", { ascending: true });

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Turmas / Aulas
        </h1>
      </div>

      <section className="card" style={{ marginBottom: "clamp(24px, 6vw, 32px)", padding: "clamp(18px, 4.5vw, 24px)" }}>
        <h2 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Nova aula
        </h2>
        <CreateLessonForm coaches={coaches ?? []} locations={locations ?? []} modalities={modalities ?? []} schools={schools ?? []} />
      </section>

      <section>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Aulas
        </h2>
        <TurmasViewSwitcher view={view} weekMonday={weekMonday} weekMondayForLink={weekMondayForLink} />
        {lessonsError && (
          <p style={{ color: "var(--danger)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Erro ao carregar: {lessonsError.message}
          </p>
        )}
        {!lessonsError && (!lessons || lessons.length === 0) && (
          <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Nenhuma aula criada. Adiciona acima.
          </p>
        )}
        {!lessonsError && view === "semana" && weekMonday && weekEnd && lessons && (() => {
          const inRange = lessons.filter((l) => l.date >= weekMonday && l.date <= weekEnd) as LessonRow[];
          const byDate = new Map<string, LessonRow[]>();
          for (let i = 0; i < 7; i++) {
            const d = new Date(weekMonday.replace(/-/g, "/"));
            d.setDate(d.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${day}`;
            byDate.set(dateStr, []);
          }
          for (const lesson of inRange) {
            if (!byDate.has(lesson.date)) byDate.set(lesson.date, []);
            byDate.get(lesson.date)!.push(lesson);
          }
          for (const arr of byDate.values()) arr.sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
          const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekMonday.replace(/-/g, "/"));
            d.setDate(d.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          });
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 24px)" }}>
              {weekDays.map((dateStr) => {
                const dayLessons = byDate.get(dateStr) ?? [];
                const dayLabel = getWeekdayName(dateStr);
                const dateFormatted = formatLessonDate(dateStr);
                return (
                  <div key={dateStr} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                    <h3 style={{ margin: "0 0 clamp(10px, 2.5vw, 12px) 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {dayLabel}, {dateFormatted}
                      {dayLessons.length > 0 && (
                        <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
                          {" "}({dayLessons.length} {dayLessons.length === 1 ? "aula" : "aulas"})
                        </span>
                      )}
                    </h3>
                    {dayLessons.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>Sem aulas neste dia.</p>
                    ) : (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
                        {dayLessons.map((lesson) => {
                          const locationName = lesson.locationId ? locations?.find((l) => l.id === lesson.locationId)?.name : null;
                          const coachName = (coaches ?? []).find((c) => c.id === lesson.coachId)?.name ?? null;
                          const modalityName = (modalities ?? []).find((m) => m.code === lesson.modality)?.name ?? MODALITY_LABELS[lesson.modality ?? ""] ?? lesson.modality ?? "";
                          return (
                            <li key={lesson.id} style={{ padding: "10px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 8 }}>
                              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                                {lesson.isOneOff && (
                                  <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--bg-primary)", color: "var(--text-secondary)" }}>
                                    Aula única
                                  </span>
                                )}
                                <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                                  {lesson.startTime}–{lesson.endTime}
                                </span>
                                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{modalityName}</span>
                                {coachName && <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}· {coachName}</span>}
                                {locationName && <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}· {locationName}</span>}
                                {lesson.capacity != null && (
                                  <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>(cap. {lesson.capacity})</span>
                                )}
                                <Link
                                  href={`/admin/turmas/${lesson.id}`}
                                  style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none" }}
                                >
                                  Editar →
                                </Link>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
        {!lessonsError && view === "modalidade" && lessons && lessons.length > 0 && (() => {
          const byModality = new Map<string, typeof lessons>();
          for (const lesson of lessons) {
            const mod = lesson.modality ?? "OTHER";
            if (!byModality.has(mod)) byModality.set(mod, []);
            byModality.get(mod)!.push(lesson);
          }
          const modalityOrder = (modalities ?? []).map((m) => m.code);
          const orderedModalities = [
            ...modalityOrder.filter((code) => byModality.has(code)),
            ...[...byModality.keys()].filter((code) => !modalityOrder.includes(code)).sort(),
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 28px)" }}>
              {orderedModalities.map((modCode) => {
                const groupLessons = byModality.get(modCode)!;
                const modalityName = (modalities ?? []).find((m) => m.code === modCode)?.name ?? MODALITY_LABELS[modCode] ?? modCode;
                return (
                  <div key={modCode}>
                    <h3 style={{ margin: "0 0 clamp(10px, 2.5vw, 14px) 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {modalityName}
                      <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
                        {" "}({groupLessons.length} {groupLessons.length === 1 ? "aula" : "aulas"})
                      </span>
                    </h3>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
                      {groupLessons.map((lesson) => {
                        const locationName = (lesson as { locationId?: string }).locationId ? locations?.find((l) => l.id === (lesson as { locationId: string }).locationId)?.name : null;
                        const coachName = (coaches ?? []).find((c) => c.id === lesson.coachId)?.name ?? null;
                        return (
                          <li key={lesson.id} className="card" style={{ padding: "clamp(12px, 3vw, 16px)" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                              {(lesson as { isOneOff?: boolean }).isOneOff && (
                                <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                                  Aula única
                                </span>
                              )}
                              {coachName && (
                                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                                  {coachName}
                                </span>
                              )}
                              {locationName && (
                                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                                  · {locationName}
                                </span>
                              )}
                              <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                                {formatLessonDate(lesson.date)} · {lesson.startTime}–{lesson.endTime}
                              </span>
                              {lesson.capacity != null && (
                                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                                  (cap. {lesson.capacity})
                                </span>
                              )}
                              <Link
                                href={`/admin/turmas/${lesson.id}`}
                                style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none" }}
                              >
                                Editar →
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
