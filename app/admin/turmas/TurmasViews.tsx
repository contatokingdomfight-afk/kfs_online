import React from "react";
import Link from "next/link";
import { MODALITY_LABELS, formatLessonDate, getWeekdayName } from "@/lib/lesson-utils";
import type { CachedModalityRef } from "@/lib/cached-reference-data";

export type LessonRow = {
  id: string;
  modality: string | null;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  coachId: string | null;
  locationId: string | null;
  planningNotes: string | null;
  isOneOff?: boolean;
  createdAt?: string;
};

export type Coach = { id: string; name: string };
export type Location = { id: string; name: string };

type WeekViewProps = {
  weekMonday: string;
  weekEnd: string;
  lessons: LessonRow[];
  locations: Location[] | null;
  coaches: Coach[] | null;
  modalities: CachedModalityRef[] | null;
};

export function WeekView({ weekMonday, weekEnd, lessons, locations, coaches, modalities }: WeekViewProps) {
  const inRange = lessons.filter((l) => l.date >= weekMonday && l.date <= weekEnd);
  const byDate = new Map<string, LessonRow[]>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday.replace(/-/g, "/"));
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    byDate.set(`${y}-${m}-${day}`, []);
  }
  for (const lesson of inRange) {
    if (!byDate.has(lesson.date)) byDate.set(lesson.date, []);
    byDate.get(lesson.date)!.push(lesson);
  }
  for (const arr of byDate.values()) arr.sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday.replace(/-/g, "/"));
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 24px)" }}>
      {weekDays.map((dateStr) => (
        <WeekDayCard
          key={dateStr}
          dateStr={dateStr}
          dayLessons={byDate.get(dateStr) ?? []}
          locations={locations}
          coaches={coaches}
          modalities={modalities}
        />
      ))}
    </div>
  );
}

function WeekDayCard({
  dateStr,
  dayLessons,
  locations,
  coaches,
  modalities,
}: {
  dateStr: string;
  dayLessons: LessonRow[];
  locations: Location[] | null;
  coaches: Coach[] | null;
  modalities: CachedModalityRef[] | null;
}) {
  const dayLabel = getWeekdayName(dateStr);
  const dateFormatted = formatLessonDate(dateStr);
  return (
    <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
      <h3 style={{ margin: "0 0 clamp(10px, 2.5vw, 12px) 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {dayLabel}, {dateFormatted}
        {dayLessons.length > 0 && (
          <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
            {" "}({dayLessons.length} {dayLessons.length === 1 ? "aula" : "aulas"})
          </span>
        )}
      </h3>
      {dayLessons.length === 0 ? (
        <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>Sem aulas neste dia.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
          {dayLessons.map((lesson) => (
            <WeekLessonRow
              key={lesson.id}
              lesson={lesson}
              locations={locations}
              coaches={coaches}
              modalities={modalities}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function WeekLessonRow({
  lesson,
  locations,
  coaches,
  modalities,
}: {
  lesson: LessonRow;
  locations: Location[] | null;
  coaches: Coach[] | null;
  modalities: CachedModalityRef[] | null;
}) {
  const locationName = lesson.locationId ? locations?.find((l) => l.id === lesson.locationId)?.name : null;
  const coachName = coaches?.find((c) => c.id === lesson.coachId)?.name ?? null;
  const modalityName = (modalities ?? []).find((m) => m.code === lesson.modality)?.name ?? MODALITY_LABELS[lesson.modality ?? ""] ?? lesson.modality ?? "";
  return React.createElement(
    "li",
    { style: { padding: "10px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 8 } },
    React.createElement(
      "div",
      { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 } },
      lesson.isOneOff && React.createElement("span", { style: { fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--bg-primary)", color: "var(--text-secondary)" } }, "Aula única"),
      React.createElement("span", { style: { fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" } }, `${lesson.startTime}–${lesson.endTime}`),
      React.createElement("span", { style: { fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" } }, modalityName),
      coachName && React.createElement("span", { style: { fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" } }, "· ", coachName),
      locationName && React.createElement("span", { style: { fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" } }, "· ", locationName),
      lesson.capacity != null && React.createElement("span", { style: { fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" } }, `(cap. ${lesson.capacity})`),
      React.createElement(Link, { href: `/admin/turmas/${lesson.id}`, style: { marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none" } }, "Editar →")
    )
  );
}

type ModalityViewProps = {
  lessons: LessonRow[];
  modalities: CachedModalityRef[] | null;
  locations: Location[] | null;
  coaches: Coach[] | null;
};

export function ModalityView({ lessons, modalities, locations, coaches }: ModalityViewProps) {
  const byModality = new Map<string, LessonRow[]>();
  for (const lesson of lessons) {
    const mod = lesson.modality ?? "OTHER";
    if (!byModality.has(mod)) byModality.set(mod, []);
    byModality.get(mod)!.push(lesson);
  }
  const modalityOrder = (modalities ?? []).map((m) => m.code);
  const orderedModalities = [
    ...modalityOrder.filter((code) => byModality.has(code)),
    ...[...byModality.keys()].filter((code) => !modalityOrder.includes(code)).sort(),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 28px)" }}>
      {orderedModalities.map((modCode) => (
        <ModalityGroup
          key={modCode}
          modCode={modCode}
          groupLessons={byModality.get(modCode)!}
          modalities={modalities}
          locations={locations}
          coaches={coaches}
        />
      ))}
    </div>
  );
}

function ModalityGroup({
  modCode,
  groupLessons,
  modalities,
  locations,
  coaches,
}: {
  modCode: string;
  groupLessons: LessonRow[];
  modalities: CachedModalityRef[] | null;
  locations: Location[] | null;
  coaches: Coach[] | null;
}) {
  const modalityName = (modalities ?? []).find((m) => m.code === modCode)?.name ?? MODALITY_LABELS[modCode] ?? modCode;
  return (
    <div>
      <h3 style={{ margin: "0 0 clamp(10px, 2.5vw, 14px) 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {modalityName}
        <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
          {" "}({groupLessons.length} {groupLessons.length === 1 ? "aula" : "aulas"})
        </span>
      </h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
        {groupLessons.map((lesson) => (
          <ModalityLessonRow key={lesson.id} lesson={lesson} locations={locations} coaches={coaches} />
        ))}
      </ul>
    </div>
  );
}

function ModalityLessonRow({
  lesson,
  locations,
  coaches,
}: {
  lesson: LessonRow;
  locations: Location[] | null;
  coaches: Coach[] | null;
}) {
  const locationName = lesson.locationId ? locations?.find((l) => l.id === lesson.locationId)?.name : null;
  const coachName = coaches?.find((c) => c.id === lesson.coachId)?.name ?? null;
  return (
    <li className="card" style={{ padding: "clamp(12px, 3vw, 16px)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {lesson.isOneOff && (
          <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
            Aula única
          </span>
        )}
        {coachName && (
          <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
            {coachName}
          </span>
        )}
        {locationName && (
          <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
            · {locationName}
          </span>
        )}
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {formatLessonDate(lesson.date)} · {lesson.startTime}–{lesson.endTime}
        </span>
        {lesson.capacity != null && (
          <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
            (cap. {lesson.capacity})
          </span>
        )}
        <Link
          href={`/admin/turmas/${lesson.id}`}
          style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", textDecoration: "none" }}
        >
          Editar →
        </Link>
      </div>
    </li>
  );
}
