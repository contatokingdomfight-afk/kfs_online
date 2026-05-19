import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getThisWeekRange, formatLessonDate, MODALITY_LABELS } from "@/lib/lesson-utils";
import { getCachedLocations } from "@/lib/cached-reference-data";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  rowsToLessonDefinitions,
} from "@/lib/lesson-occurrences";
import QRCode from "qrcode";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";

async function getBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() can throw in some contexts
  }
  return "http://localhost:3000";
}

type Props = { searchParams: Promise<{ lesson?: string; date?: string }> };

export default async function CoachAulaQrPage({ searchParams }: Props) {
  const baseUrl = await getBaseUrl();
  const supabase = await createClient();
  const dbUser = await getCurrentDbUser();
  const schoolAssistant =
    dbUser?.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;

  const { today, endOfWeek } = getThisWeekRange();
  const params = await searchParams;
  const lessonId = params.lesson ?? null;
  const dateParam = params.date?.trim().slice(0, 10) ?? null;

  let lessonsRaw =
    (
      await supabase
        .from("Lesson")
        .select(
          "id, modality, date, weekday, startTime, endTime, locationId, schoolId, isOneOff, coachId, isOpenClass, capacity, planningNotes"
        )
        .order("startTime", { ascending: true })
    ).data ?? [];

  if (schoolAssistant) {
    lessonsRaw = lessonsRaw.filter((row) => (row as { schoolId?: string }).schoolId === schoolAssistant.schoolId);
  }

  const lessonIds = (lessonsRaw ?? []).map((l) => (l as { id: string }).id);
  const cancellations = await fetchLessonCancellations(supabase, lessonIds);

  const lessonsAsDefs = rowsToLessonDefinitions(lessonsRaw ?? []);

  const lessons = expandLessonsForDateRange(lessonsAsDefs, cancellations, today, endOfWeek);
  const locationIds = [...new Set(lessons.map((l) => l.locationId).filter(Boolean))] as string[];
  const allLocations = await getCachedLocations(supabase);
  const locations = locationIds.length > 0 ? allLocations.filter((l) => locationIds.includes(l.id)) : [];
  const locationById = new Map(locations.map((loc) => [loc.id, loc.name]));

  const selectedId =
    lessonId && lessons.some((l) => l.id === lessonId) ? lessonId : lessons[0]?.id ?? null;
  const selectedLesson = selectedId
    ? dateParam
      ? lessons.find((l) => l.id === selectedId && l.occurrenceDate === dateParam) ??
        lessons.find((l) => l.id === selectedId)
      : lessons.find((l) => l.id === selectedId)
    : null;

  let qrDataUrl: string | null = null;
  if (selectedId && selectedLesson) {
    const dateForCheckIn = selectedLesson.occurrenceDate;
    const checkInUrl = `${baseUrl}/check-in/${selectedId}?date=${encodeURIComponent(dateForCheckIn)}`;
    qrDataUrl = await QRCode.toDataURL(checkInUrl, { width: 280, margin: 2 });
  }

  return (
    <div style={{ maxWidth: "min(400px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)", display: "flex", alignItems: "center", gap: "clamp(12px, 3vw, 16px)" }}>
        <Link
          href="/coach/aula"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h2 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          QR Code da aula
        </h2>
      </div>

      {lessons.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Nenhuma aula esta semana.
        </p>
      ) : (
        <>
          <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)", marginBottom: "clamp(12px, 3vw, 16px)" }}>
            Escolhe a aula para mostrar o QR:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 clamp(20px, 5vw, 24px) 0", display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {lessons.map((l) => {
              const isSelected =
                selectedLesson &&
                l.id === selectedLesson.id &&
                l.occurrenceDate === selectedLesson.occurrenceDate;
              return (
              <li key={l.occurrenceKey}>
                <Link
                  href={`/coach/aula/qr?lesson=${l.id}&date=${encodeURIComponent(l.occurrenceDate)}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "clamp(14px, 3.5vw, 16px)",
                    backgroundColor: isSelected ? "var(--primary)" : "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: isSelected ? "#fff" : "var(--text-primary)",
                    textDecoration: "none",
                    fontSize: "clamp(15px, 3.8vw, 17px)",
                    fontWeight: isSelected ? 600 : 400,
                    minHeight: "clamp(48px, 12vw, 56px)",
                    boxSizing: "border-box",
                  }}
                >
                  {MODALITY_LABELS[l.modality ?? ""] ?? l.modality ?? ""}
                  {l.locationId && locationById.get(l.locationId) ? ` · ${locationById.get(l.locationId)}` : ""}
                  {" · "}{formatLessonDate(l.occurrenceDate)} · {l.startTime}–{l.endTime}
                </Link>
              </li>
            );
            })}
          </ul>

          {selectedLesson && qrDataUrl && (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "clamp(24px, 6vw, 32px)",
              }}
            >
              <p style={{ margin: "0 0 16px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                {MODALITY_LABELS[selectedLesson.modality ?? ""] ?? selectedLesson.modality ?? ""}
              </p>
              <p style={{ margin: "0 0 20px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                {selectedLesson.locationId && locationById.get(selectedLesson.locationId)
                  ? `${locationById.get(selectedLesson.locationId)} · `
                  : ""}
                {formatLessonDate(selectedLesson.occurrenceDate)} · {selectedLesson.startTime}–{selectedLesson.endTime}
              </p>
              <div style={{ display: "inline-block", padding: 16, backgroundColor: "#fff", borderRadius: "var(--radius-md)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR Code para check-in"
                  width={280}
                  height={280}
                  style={{ display: "block" }}
                />
              </div>
              <p style={{ margin: "16px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                Os alunos escaneiam para marcar presença
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
