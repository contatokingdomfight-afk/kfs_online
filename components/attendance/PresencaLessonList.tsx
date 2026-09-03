"use client";

import { useState } from "react";
import { AttendanceRosterModal, type AttendanceRosterAttendee } from "./AttendanceRosterModal";

export type PresencaLessonItem = {
  key: string;
  modalityLabel: string;
  dateLabel: string;
  timeLabel: string;
  manageHref: string | null;
  attendees: AttendanceRosterAttendee[];
};

type Props = {
  lessons: PresencaLessonItem[];
  statusLabel: Record<string, string>;
};

function attendanceSummary(attendees: AttendanceRosterAttendee[]): string {
  if (attendees.length === 0) return "Ninguém marcou presença ainda.";
  const confirmed = attendees.filter((a) => a.status === "CONFIRMED").length;
  const rest = attendees.length - confirmed;
  const confirmedLabel = `${confirmed} presente${confirmed === 1 ? "" : "s"}`;
  return rest > 0 ? `${confirmedLabel} · ${rest} outro${rest === 1 ? "" : "s"}` : confirmedLabel;
}

export function PresencaLessonList({ lessons, statusLabel }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openLesson = lessons.find((l) => l.key === openKey) ?? null;

  return (
    <>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
        {lessons.map((lesson) => (
          <li
            key={lesson.key}
            className="card"
            role="button"
            tabIndex={0}
            onClick={() => setOpenKey(lesson.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenKey(lesson.key);
              }
            }}
            style={{
              padding: "clamp(14px, 3.5vw, 18px)",
              cursor: "pointer",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
              {lesson.modalityLabel}
            </span>
            <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
              {lesson.dateLabel} · {lesson.timeLabel}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "clamp(13px, 3.2vw, 15px)",
                color: lesson.attendees.some((a) => a.status === "CONFIRMED") ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {attendanceSummary(lesson.attendees)}
            </span>
          </li>
        ))}
      </ul>
      {openLesson && (
        <AttendanceRosterModal
          modalityLabel={openLesson.modalityLabel}
          dateLabel={openLesson.dateLabel}
          timeLabel={openLesson.timeLabel}
          attendees={openLesson.attendees}
          statusLabel={statusLabel}
          manageHref={openLesson.manageHref}
          onClose={() => setOpenKey(null)}
        />
      )}
    </>
  );
}
