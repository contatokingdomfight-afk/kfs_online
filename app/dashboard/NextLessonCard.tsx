import Link from "next/link";
import { formatNextLessonDate, MODALITY_LABELS } from "@/lib/lesson-utils";
import { VouNaoVouButtons } from "./VouNaoVouButtons";

type Lesson = {
  id: string;
  modality: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string | null;
};

type Props = {
  lesson: Lesson | null;
  locationById: Map<string, string>;
  attendanceByLesson: Record<string, { status: string; checkedInAt: string | null }>;
  locale: "pt" | "en";
  todayStr: string;
  hasCheckIn: boolean;
  t: (key: string) => string;
  statusLabels: Record<string, string>;
};

export function NextLessonCard({
  lesson,
  locationById,
  attendanceByLesson,
  locale,
  todayStr,
  hasCheckIn,
  t,
  statusLabels,
}: Props) {
  if (!hasCheckIn) return null;

  if (!lesson) {
    return (
      <section>
        <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
          ⚡ {t("dashboardNextLessonTitle")}
        </h2>
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
            {t("dashboardNoClassesThisWeek")}
          </p>
          <Link
            href="/dashboard/biblioteca"
            className="btn btn-primary"
            style={{
              marginTop: 16,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              minHeight: 44,
            }}
          >
            {t("dashboardExploreLibrary")}
          </Link>
        </div>
      </section>
    );
  }

  const att = attendanceByLesson[lesson.id];
  const isToday = lesson.date === todayStr;

  return (
    <section>
      <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
        ⚡ {t("dashboardNextLessonTitle")}
      </h2>
      <div
        className="card"
        style={{
          backgroundColor: "var(--primary)",
          color: "#fff",
          padding: "clamp(20px, 5vw, 24px)",
        }}
      >
        <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", margin: "0 0 8px 0", opacity: 0.9 }}>
          {t("dashboardNextLessonSubtitle")}
        </p>
        <p style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, margin: "0 0 8px 0" }}>
          {MODALITY_LABELS[lesson.modality] ?? lesson.modality}
        </p>
        <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", margin: "0 0 12px 0", opacity: 0.9 }}>
          {lesson.locationId && locationById.get(lesson.locationId) ? `${locationById.get(lesson.locationId)} · ` : ""}
          {formatNextLessonDate(lesson.date, locale)} · {lesson.startTime}–{lesson.endTime}
        </p>
        <div style={{ marginTop: 12 }}>
          <VouNaoVouButtons
            lessonId={lesson.id}
            currentStatus={att?.status}
            checkedInAt={att?.checkedInAt ?? null}
            goingLabel={t("goingLabel")}
            notGoingLabel={t("notGoingLabel")}
            intentGoingLabel={t("intentGoingLabel")}
            checkInDoneLabel={t("checkInDoneLabel")}
            statusConfirmedLabel={statusLabels.CONFIRMED}
            statusAbsentLabel={statusLabels.ABSENT}
          />
        </div>
        <Link
          href={`/check-in/${lesson.id}`}
          className="btn"
          style={{
            marginTop: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 48,
            fontSize: "clamp(15px, 3.8vw, 17px)",
            fontWeight: 600,
            textDecoration: "none",
            backgroundColor: isToday ? "#fff" : "rgba(255,255,255,0.2)",
            color: isToday ? "var(--primary)" : "#fff",
            border: isToday ? "none" : "2px solid rgba(255,255,255,0.6)",
          }}
        >
          📲 {t("dashboardCheckInButton")}
        </Link>
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: "clamp(12px, 3vw, 14px)", opacity: 0.9 }}>
          {t("atGymScanQr")}{" "}
          <a href={`/check-in/${lesson.id}`} style={{ color: "#fff", textDecoration: "underline" }}>
            {t("openLinkOnPhone")}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
