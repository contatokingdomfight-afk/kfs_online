import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getThisWeekRange, formatLessonDate, MODALITY_LABELS } from "@/lib/lesson-utils";
import QRCode from "qrcode";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type Props = { searchParams: Promise<{ lesson?: string }> };

export default async function CoachAulaQrPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { today, endOfWeek } = getThisWeekRange();
  const params = await searchParams;
  const lessonId = params.lesson ?? null;

  const { data: lessonsData } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, locationId")
    .gte("date", today)
    .lte("date", endOfWeek)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  const lessons = lessonsData ?? [];
  const locationIds = [...new Set((lessons as { locationId?: string }[]).map((l) => l.locationId).filter(Boolean))];
  const { data: locations } =
    locationIds.length > 0
      ? await supabase.from("Location").select("id, name").in("id", locationIds)
      : { data: [] as { id: string; name: string }[] };
  const locationById = new Map((locations ?? []).map((loc) => [loc.id, loc.name]));

  const selectedId =
    lessonId && lessons.some((l) => l.id === lessonId) ? lessonId : lessons[0]?.id ?? null;
  const selectedLesson = selectedId ? lessons.find((l) => l.id === selectedId) : null;

  let qrDataUrl: string | null = null;
  if (selectedId) {
    const checkInUrl = `${baseUrl}/check-in/${selectedId}`;
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
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/coach/aula/qr?lesson=${l.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "clamp(14px, 3.5vw, 16px)",
                    backgroundColor: l.id === selectedId ? "var(--primary)" : "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: l.id === selectedId ? "#fff" : "var(--text-primary)",
                    textDecoration: "none",
                    fontSize: "clamp(15px, 3.8vw, 17px)",
                    fontWeight: l.id === selectedId ? 600 : 400,
                    minHeight: "clamp(48px, 12vw, 56px)",
                    boxSizing: "border-box",
                  }}
                >
                  {MODALITY_LABELS[l.modality] ?? l.modality}
                  {(l as { locationId?: string }).locationId && locationById.get((l as { locationId: string }).locationId)
                    ? ` · ${locationById.get((l as { locationId: string }).locationId)}`
                    : ""}
                  {" · "}{formatLessonDate(l.date)} · {l.startTime}–{l.endTime}
                </Link>
              </li>
            ))}
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
                {MODALITY_LABELS[selectedLesson.modality] ?? selectedLesson.modality}
              </p>
              <p style={{ margin: "0 0 20px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                {(selectedLesson as { locationId?: string }).locationId && locationById.get((selectedLesson as { locationId: string }).locationId)
                  ? `${locationById.get((selectedLesson as { locationId: string }).locationId)} · `
                  : ""}
                {formatLessonDate(selectedLesson.date)} · {selectedLesson.startTime}–{selectedLesson.endTime}
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
