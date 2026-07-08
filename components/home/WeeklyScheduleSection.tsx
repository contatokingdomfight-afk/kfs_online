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

function MobileCompactLesson({ lesson }: { lesson: PublicScheduleLesson }) {
  return (
    <li className="flex items-start gap-3 border-t border-[var(--border)]/50 py-2.5 first:border-t-0 first:pt-0">
      <span className="w-[4.75rem] shrink-0 pt-0.5 font-mono text-[11px] font-semibold leading-tight tabular-nums text-[var(--primary)]">
        {formatClock(lesson.startTime)}
        <span className="block text-[10px] font-normal text-[var(--text-secondary)]">{formatClock(lesson.endTime)}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{lesson.modalityLabel}</p>
        {lesson.locationName && (
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{lesson.locationName}</p>
        )}
      </div>
    </li>
  );
}

/** Agenda compacta por dia — telemóvel. */
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
    <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] lg:hidden">
      {daysWithLessons.map((weekday) => {
        const lessons = school.lessonsByWeekday[weekday] ?? [];
        return (
          <div key={weekday} className="px-3 py-3 sm:px-4">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-[var(--primary)]">
                  {weekdayShortLabelForPublicSchedule(weekday, locale)}
                </span>
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {weekdayLabelForPublicSchedule(weekday, locale)}
                </span>
              </div>
              <span className="shrink-0 text-[11px] text-[var(--text-secondary)]">
                {lessonCountLabel(lessons.length, locale)}
              </span>
            </div>
            <ul className="list-none p-0 m-0">
              {lessons.map((lesson) => (
                <MobileCompactLesson key={lesson.id} lesson={lesson} />
              ))}
            </ul>
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
