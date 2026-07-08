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

/** Paleta de acentos por modalidade (estável por código). */
const MODALITY_ACCENTS = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function modalityAccent(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return MODALITY_ACCENTS[hash % MODALITY_ACCENTS.length];
}

function formatClock(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function schoolHasLessons(schedule: PublicSchoolSchedule): boolean {
  return PUBLIC_SCHEDULE_WEEKDAYS.some((wd) => (schedule.lessonsByWeekday[wd]?.length ?? 0) > 0);
}

function lessonCountLabel(count: number, locale: "pt" | "en"): string {
  if (locale === "en") return count === 1 ? "1 class" : `${count} classes`;
  return count === 1 ? "1 aula" : `${count} aulas`;
}

/** Cartão de aula (desktop, dentro da coluna do dia). */
function LessonBlock({ lesson }: { lesson: PublicScheduleLesson }) {
  const accent = modalityAccent(lesson.modality);
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 shadow-sm transition-all hover:shadow-md"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-xs font-bold tabular-nums" style={{ color: accent }}>
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

/** Cartão de aula (mobile). */
function MobileLessonCard({ lesson }: { lesson: PublicScheduleLesson }) {
  const accent = modalityAccent(lesson.modality);
  return (
    <li
      className="flex items-stretch gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 shadow-sm"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--bg-secondary)] py-2">
        <span className="font-mono text-sm font-bold leading-none tabular-nums" style={{ color: accent }}>
          {formatClock(lesson.startTime)}
        </span>
        <span className="mt-1 font-mono text-[11px] leading-none tabular-nums text-[var(--text-secondary)]">
          {formatClock(lesson.endTime)}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-[15px] font-semibold leading-snug text-[var(--text-primary)]">{lesson.modalityLabel}</p>
        {lesson.locationName && (
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{lesson.locationName}</p>
        )}
      </div>
    </li>
  );
}

/** Agenda por dia — telemóvel. */
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
    <div className="space-y-6 lg:hidden">
      {daysWithLessons.map((weekday) => {
        const lessons = school.lessonsByWeekday[weekday] ?? [];
        return (
          <div key={weekday}>
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="inline-flex h-8 items-center rounded-full bg-[var(--primary)] px-3 text-xs font-bold uppercase tracking-wide text-white">
                {weekdayShortLabelForPublicSchedule(weekday, locale)}
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {weekdayLabelForPublicSchedule(weekday, locale)}
              </span>
              <span className="ml-auto text-[11px] text-[var(--text-secondary)]">
                {lessonCountLabel(lessons.length, locale)}
              </span>
            </div>
            <ul className="m-0 list-none space-y-2 p-0">
              {lessons.map((lesson) => (
                <MobileLessonCard key={lesson.id} lesson={lesson} />
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
