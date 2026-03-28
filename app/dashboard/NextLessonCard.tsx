import Link from "next/link";
import { LessonPromoBlock, type LessonPromoLesson } from "./LessonPromoBlock";

type Props = {
  lesson: LessonPromoLesson | null;
  studentSchoolId?: string | null;
  locationById: Record<string, string>;
  attendanceByLesson: Record<string, { status: string; checkedInAt: string | null }>;
  locale: "pt" | "en";
  todayStr: string;
  isFreeTier?: boolean;
  checkInWindowOpen?: boolean;
  checkInStartTimeLabel?: string | null;
  t: (key: string) => string;
  statusLabels: Record<string, string>;
};

export function NextLessonCard({
  lesson,
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
    </section>
  );
}
