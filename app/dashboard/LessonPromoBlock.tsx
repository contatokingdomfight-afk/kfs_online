import Link from "next/link";
import { formatNextLessonDate, MODALITY_LABELS } from "@/lib/lesson-utils";
import { VouNaoVouButtons } from "./VouNaoVouButtons";

export type LessonPromoLesson = {
  id: string;
  modality: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string | null;
  isOpenClass?: boolean;
  schoolId?: string | null;
  schoolName?: string | null;
};

export type OpenLessonRow = {
  lesson: LessonPromoLesson;
  checkInWindowOpen: boolean;
  checkInStartTimeLabel: string | null;
};

type Props = OpenLessonRow & {
  studentSchoolId: string | null;
  locationById: Map<string, string>;
  attendanceByLesson: Record<string, { status: string; checkedInAt: string | null }>;
  locale: "pt" | "en";
  todayStr: string;
  isFreeTier: boolean;
  t: (key: string) => string;
  statusLabels: Record<string, string>;
};

export function LessonPromoBlock({
  lesson,
  studentSchoolId,
  locationById,
  attendanceByLesson,
  locale,
  todayStr,
  isFreeTier,
  checkInWindowOpen,
  checkInStartTimeLabel,
  t,
  statusLabels,
}: Props) {
  const att = attendanceByLesson[lesson.id];
  const isToday = lesson.date === todayStr;
  const openClassParticipation = Boolean(lesson.isOpenClass);
  const canUseCheckInLink = (!isFreeTier || openClassParticipation) && checkInWindowOpen;
  const locationName = lesson.locationId ? locationById.get(lesson.locationId) : null;
  const isOtherSchoolOpen =
    Boolean(lesson.isOpenClass) &&
    studentSchoolId != null &&
    lesson.schoolId != null &&
    lesson.schoolId !== studentSchoolId;
  const openClassLocationHighlight =
    Boolean(lesson.isOpenClass) && Boolean(lesson.schoolName || locationName);

  return (
    <div
      className="card"
      style={{
        backgroundColor: "var(--primary)",
        color: "#fff",
        padding: "clamp(20px, 5vw, 24px)",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", margin: "0 0 8px 0", opacity: 0.9 }}>
        {t("dashboardNextLessonSubtitle")}
      </p>
      {openClassLocationHighlight && (
        <div
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            backgroundColor: isOtherSchoolOpen ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
            borderRadius: 10,
            borderLeft: isOtherSchoolOpen ? "4px solid #fff" : "3px solid rgba(255,255,255,0.45)",
          }}
        >
          {lesson.schoolName && (
            <p style={{ margin: 0, fontWeight: 700, fontSize: "clamp(16px, 4vw, 19px)", lineHeight: 1.35 }}>
              {lesson.schoolName}
            </p>
          )}
          {locationName && (
            <p
              style={{
                margin: lesson.schoolName ? "6px 0 0" : 0,
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: 600,
                opacity: 0.98,
              }}
            >
              {locationName}
            </p>
          )}
          {isOtherSchoolOpen && (
            <p style={{ margin: "8px 0 0", fontSize: "clamp(12px, 3vw, 13px)", opacity: 0.92 }}>
              {t("dashboardOpenClassOtherSchoolHint")}
            </p>
          )}
        </div>
      )}
      <p style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, margin: "0 0 8px 0" }}>
        {MODALITY_LABELS[lesson.modality] ?? lesson.modality}
        {lesson.isOpenClass && (
          <span
            style={{
              marginLeft: 8,
              fontSize: "clamp(12px, 3vw, 14px)",
              fontWeight: 600,
              backgroundColor: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.55)",
              borderRadius: 999,
              padding: "2px 8px",
            }}
          >
            Aula livre
          </span>
        )}
      </p>
      <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", margin: "0 0 12px 0", opacity: 0.9 }}>
        {!openClassLocationHighlight && locationName ? `${locationName} · ` : ""}
        {formatNextLessonDate(lesson.date, locale)} · {lesson.startTime}–{lesson.endTime}
      </p>
      <div style={{ marginTop: 12 }}>
        {isFreeTier && !openClassParticipation ? (
          <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
            🔒 {t("freeTierSubscribeToParticipate")}
          </p>
        ) : (
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
        )}
      </div>
      {(!isFreeTier || openClassParticipation) && checkInStartTimeLabel && !checkInWindowOpen && (
        <p style={{ marginTop: 14, marginBottom: 0, fontSize: "clamp(13px, 3.2vw, 15px)", opacity: 0.95 }}>
          {t("dashboardCheckInAvailableFrom").replace("{time}", checkInStartTimeLabel)}
        </p>
      )}
      {canUseCheckInLink && (
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
      )}
      {canUseCheckInLink && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: "clamp(12px, 3vw, 14px)", opacity: 0.9 }}>
          {t("atGymScanQr")}{" "}
          <Link href={`/check-in/${lesson.id}`} style={{ color: "#fff", textDecoration: "underline" }}>
            {t("openLinkOnPhone")}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
