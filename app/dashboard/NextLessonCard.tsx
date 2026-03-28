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
  isOpenClass?: boolean;
  schoolId?: string | null;
  schoolName?: string | null;
};

type OpenLessonRow = {
  lesson: Lesson;
  checkInWindowOpen: boolean;
  checkInStartTimeLabel: string | null;
};

type Props = {
  lesson: Lesson | null;
  /** Outras aulas livres na semana (ex.: sábado) quando a «próxima» já é outra aula no calendário. */
  additionalOpenLessons?: OpenLessonRow[];
  /** Escola do aluno (para destacar aulas livres noutra sede). */
  studentSchoolId?: string | null;
  locationById: Map<string, string>;
  attendanceByLesson: Record<string, { status: string; checkedInAt: string | null }>;
  locale: "pt" | "en";
  todayStr: string;
  isFreeTier?: boolean;
  /** Se o check-in está na janela (início da aula até fim + 3h). */
  checkInWindowOpen?: boolean;
  /** HH:mm em Lisboa; só quando ainda não abriu a janela. */
  checkInStartTimeLabel?: string | null;
  t: (key: string) => string;
  statusLabels: Record<string, string>;
};

function LessonPromoBlock({
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
}: OpenLessonRow & {
  studentSchoolId: string | null;
  locationById: Map<string, string>;
  attendanceByLesson: Record<string, { status: string; checkedInAt: string | null }>;
  locale: "pt" | "en";
  todayStr: string;
  isFreeTier: boolean;
  t: (key: string) => string;
  statusLabels: Record<string, string>;
}) {
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

export function NextLessonCard({
  lesson,
  additionalOpenLessons = [],
  studentSchoolId = null,
  locationById,
  attendanceByLesson,
  locale,
  todayStr,
  isFreeTier = false,
  checkInWindowOpen = true,
  checkInStartTimeLabel = null,
  t,
  statusLabels,
}: Props) {
  const extras = additionalOpenLessons ?? [];

  if (!lesson && extras.length === 0) {
    return (
      <section>
        <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
          ⚡ {t("dashboardNextLessonTitle")}
        </h2>
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
            {t("dashboardNoClassesThisWeek")}
          </p>
          {!isFreeTier && (
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
          )}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
        ⚡ {t("dashboardNextLessonTitle")}
      </h2>
      {lesson && (
        <LessonPromoBlock
          lesson={lesson}
          studentSchoolId={studentSchoolId}
          checkInWindowOpen={checkInWindowOpen}
          checkInStartTimeLabel={checkInStartTimeLabel}
          locationById={locationById}
          attendanceByLesson={attendanceByLesson}
          locale={locale}
          todayStr={todayStr}
          isFreeTier={isFreeTier}
          t={t}
          statusLabels={statusLabels}
        />
      )}
      {extras.length > 0 && (
        <div style={{ marginTop: lesson ? "clamp(16px, 4vw, 20px)" : 0 }}>
          <h3
            style={{
              fontSize: "clamp(15px, 3.8vw, 17px)",
              fontWeight: 600,
              marginBottom: "clamp(10px, 2.5vw, 14px)",
              color: "var(--text-primary)",
            }}
          >
            {t("dashboardOpenClassesThisWeekTitle")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
            {extras.map((row) => (
              <LessonPromoBlock
                key={row.lesson.id}
                lesson={row.lesson}
                studentSchoolId={studentSchoolId}
                checkInWindowOpen={row.checkInWindowOpen}
                checkInStartTimeLabel={row.checkInStartTimeLabel}
                locationById={locationById}
                attendanceByLesson={attendanceByLesson}
                locale={locale}
                todayStr={todayStr}
                isFreeTier={isFreeTier}
                t={t}
                statusLabels={statusLabels}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
