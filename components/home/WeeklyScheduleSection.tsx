import Link from "next/link";
import {
  PUBLIC_SCHEDULE_WEEKDAYS,
  type PublicSchoolSchedule,
  weekdayLabelForPublicSchedule,
} from "@/lib/public-weekly-schedule";

type ScheduleContent = {
  scheduleTitle: string;
  scheduleSubtitle: string;
  scheduleEmptyDay: string;
  scheduleCta: string;
  scheduleFootnote: string;
  scheduleNoClasses: string;
};

function formatClock(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function schoolHasLessons(schedule: PublicSchoolSchedule): boolean {
  return PUBLIC_SCHEDULE_WEEKDAYS.some((wd) => (schedule.lessonsByWeekday[wd]?.length ?? 0) > 0);
}

export function WeeklyScheduleSection({
  content,
  schedule,
  locale,
}: {
  content: ScheduleContent;
  schedule: PublicSchoolSchedule[];
  locale: "pt" | "en";
}) {
  const activeSchedules = schedule.filter(schoolHasLessons);

  return (
    <section id="horarios" className="border-t border-[var(--border)] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{content.scheduleTitle}</h2>
          <p className="mt-3 text-[var(--text-secondary)]">{content.scheduleSubtitle}</p>
        </div>

        {activeSchedules.length === 0 ? (
          <p className="mx-auto mt-12 max-w-xl text-center text-[var(--text-secondary)]">{content.scheduleNoClasses}</p>
        ) : (
          <div className="mt-12 space-y-14">
            {activeSchedules.map((school) => (
              <div key={school.schoolId}>
                {activeSchedules.length > 1 && (
                  <h3 className="mb-6 text-center text-lg font-semibold text-[var(--primary)] sm:text-left">
                    {school.schoolName}
                  </h3>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {PUBLIC_SCHEDULE_WEEKDAYS.map((weekday) => {
                    const lessons = school.lessonsByWeekday[weekday] ?? [];
                    return (
                      <div
                        key={`${school.schoolId}-${weekday}`}
                        className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5"
                      >
                        <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
                          {weekdayLabelForPublicSchedule(weekday, locale)}
                        </h4>
                        {lessons.length === 0 ? (
                          <p className="mt-3 text-sm text-[var(--text-secondary)]">{content.scheduleEmptyDay}</p>
                        ) : (
                          <ul className="mt-3 space-y-3">
                            {lessons.map((lesson) => (
                              <li key={lesson.id} className="border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
                                <p className="font-medium text-[var(--text-primary)]">{lesson.modalityLabel}</p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {formatClock(lesson.startTime)} – {formatClock(lesson.endTime)}
                                </p>
                                {lesson.locationName && (
                                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{lesson.locationName}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/aula-experimental"
            className="btn btn-primary inline-flex min-h-[48px] items-center justify-center px-8 py-3 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {content.scheduleCta}
          </Link>
          <p className="mx-auto mt-4 max-w-2xl text-xs text-[var(--text-secondary)]">{content.scheduleFootnote}</p>
        </div>
      </div>
    </section>
  );
}
