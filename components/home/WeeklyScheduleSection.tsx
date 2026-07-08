import Link from "next/link";
import {
  PUBLIC_SCHEDULE_WEEKDAYS,
  type PublicScheduleLesson,
  type PublicSchoolSchedule,
  weekdayLabelForPublicSchedule,
  weekdayShortLabelForPublicSchedule,
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

function LessonBlock({ lesson }: { lesson: PublicScheduleLesson }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 shadow-sm transition-all hover:border-[var(--primary)]/45 hover:shadow-md">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-xs font-bold tabular-nums text-[var(--primary)]">
          {formatClock(lesson.startTime)}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)]">–</span>
        <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
          {formatClock(lesson.endTime)}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-[var(--text-primary)]">{lesson.modalityLabel}</p>
      {lesson.locationName && (
        <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
          {lesson.locationName}
        </p>
      )}
    </div>
  );
}

function lessonCountLabel(count: number, locale: "pt" | "en"): string {
  if (locale === "en") return count === 1 ? "1 class" : `${count} classes`;
  return count === 1 ? "1 aula" : `${count} aulas`;
}

function MobileTimelineLesson({
  lesson,
  isLast,
}: {
  lesson: PublicScheduleLesson;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-3.5">
      {!isLast && (
        <div
          className="absolute left-[1.4rem] top-14 bottom-0 w-px bg-gradient-to-b from-[var(--primary)]/35 to-transparent"
          aria-hidden
        />
      )}
      <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2 py-2.5 shadow-inner">
        <span className="font-mono text-xs font-bold leading-none tabular-nums text-[var(--primary)]">
          {formatClock(lesson.startTime)}
        </span>
        <span className="my-1.5 h-px w-5 bg-[var(--primary)]/25" aria-hidden />
        <span className="font-mono text-[10px] leading-none tabular-nums text-[var(--text-secondary)]">
          {formatClock(lesson.endTime)}
        </span>
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-5"} pt-1.5`}>
        <p className="text-[15px] font-semibold leading-snug text-[var(--text-primary)]">{lesson.modalityLabel}</p>
        {lesson.locationName && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{lesson.locationName}</p>
        )}
      </div>
    </div>
  );
}

/** Lista vertical por dia — legível em telemóvel. */
function MobileWeekList({
  school,
  locale,
}: {
  school: PublicSchoolSchedule;
  locale: "pt" | "en";
}) {
  const daysWithLessons = PUBLIC_SCHEDULE_WEEKDAYS.filter(
    (wd) => (school.lessonsByWeekday[wd]?.length ?? 0) > 0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_10px_40px_rgba(0,0,0,0.35)] lg:hidden">
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/20 via-[var(--primary)]/5 to-transparent px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          {locale === "en" ? "Weekly timetable" : "Grade da semana"}
        </p>
      </div>
      {daysWithLessons.map((weekday, dayIndex) => {
        const lessons = school.lessonsByWeekday[weekday] ?? [];
        const isLastDay = dayIndex === daysWithLessons.length - 1;
        return (
          <div
            key={weekday}
            className={`px-4 py-4 ${!isLastDay ? "border-b border-[var(--border)]" : ""}`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--primary)]/35 bg-[var(--primary)]/12 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
                  {weekdayShortLabelForPublicSchedule(weekday, locale)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {weekdayLabelForPublicSchedule(weekday, locale)}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{lessonCountLabel(lessons.length, locale)}</p>
              </div>
            </div>
            <div className="space-y-0 pl-0.5">
              {lessons.map((lesson, lessonIndex) => (
                <MobileTimelineLesson
                  key={lesson.id}
                  lesson={lesson}
                  isLast={lessonIndex === lessons.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Grade 7 colunas — desktop. */
function DesktopWeekTimetable({
  school,
  locale,
  emptyDayLabel,
}: {
  school: PublicSchoolSchedule;
  locale: "pt" | "en";
  emptyDayLabel: string;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[0_8px_30px_rgba(0,0,0,0.25)] lg:block">
      <div className="grid grid-cols-7 divide-x divide-[var(--border)]">
        {PUBLIC_SCHEDULE_WEEKDAYS.map((weekday) => {
          const lessons = school.lessonsByWeekday[weekday] ?? [];
          const hasLessons = lessons.length > 0;
          return (
            <div key={weekday} className="flex min-h-[13rem] flex-col">
              <div
                className={`border-b border-[var(--border)] px-2 py-3 text-center ${
                  hasLessons ? "bg-[var(--primary)]/10" : "bg-[var(--bg)]/60"
                }`}
              >
                <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                  {weekdayShortLabelForPublicSchedule(weekday, locale)}
                </span>
                <span className="mt-0.5 block text-[11px] font-medium text-[var(--text-secondary)]">
                  {weekdayLabelForPublicSchedule(weekday, locale)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2.5">
                {hasLessons ? (
                  lessons.map((lesson) => <LessonBlock key={lesson.id} lesson={lesson} />)
                ) : (
                  <div className="flex flex-1 items-center justify-center px-1">
                    <p className="text-center text-[11px] italic text-[var(--text-secondary)]/70">{emptyDayLabel}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekTimetable({
  school,
  locale,
  emptyDayLabel,
}: {
  school: PublicSchoolSchedule;
  locale: "pt" | "en";
  emptyDayLabel: string;
}) {
  return (
    <>
      <MobileWeekList school={school} locale={locale} />
      <DesktopWeekTimetable school={school} locale={locale} emptyDayLabel={emptyDayLabel} />
    </>
  );
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
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--primary)]">Kingdom Fight</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{content.scheduleTitle}</h2>
          <p className="mt-3 text-[var(--text-secondary)]">{content.scheduleSubtitle}</p>
        </div>

        {activeSchedules.length === 0 ? (
          <p className="mx-auto mt-12 max-w-xl text-center text-[var(--text-secondary)]">{content.scheduleNoClasses}</p>
        ) : (
          <div className="mt-12 space-y-10">
            {activeSchedules.map((school) => (
              <div key={school.schoolId}>
                {activeSchedules.length > 1 && (
                  <h3 className="mb-4 text-center text-base font-semibold text-[var(--text-primary)] sm:text-left">
                    {school.schoolName}
                  </h3>
                )}
                <WeekTimetable school={school} locale={locale} emptyDayLabel={content.scheduleEmptyDay} />
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
