"use client";

import { useMemo, useState } from "react";
import type { CoachLessonStudentRow } from "@/lib/coach-lesson-eligible-students";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { AttendanceRow } from "./AttendanceRow";

type RosterFilter = "all" | "no_rsvp" | "pending";

type Props = {
  students: CoachLessonStudentRow[];
  lessonId: string;
  occurrenceDate: string;
  modality: string;
  evaluationConfig: ModalityEvaluationConfigPayload | null;
  canEvaluate: boolean;
};

export function CoachAulaRosterPanel({
  students,
  lessonId,
  occurrenceDate,
  modality,
  evaluationConfig,
  canEvaluate,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");

  const counts = useMemo(() => {
    const confirmed = students.filter((s) => s.status === "CONFIRMED").length;
    const pending = students.filter((s) => s.status === "PENDING").length;
    const noRsvp = students.filter((s) => s.status == null).length;
    const absent = students.filter((s) => s.status === "ABSENT").length;
    return { confirmed, pending, noRsvp, absent, total: students.length };
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (filter === "no_rsvp" && s.status != null) return false;
      if (filter === "pending" && s.status !== "PENDING") return false;
      if (!q) return true;
      const name = (s.name ?? "").toLowerCase();
      const email = s.email.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [students, query, filter]);

  const filterBtn = (key: RosterFilter, label: string) => (
    <button
      key={key}
      type="button"
      className={filter === key ? "btn btn-primary" : "btn btn-secondary"}
      style={{ fontSize: 13, padding: "6px 12px" }}
      onClick={() => setFilter(key)}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
          fontSize: "clamp(13px, 3.2vw, 15px)",
          color: "var(--text-secondary)",
        }}
      >
        <span>
          <strong style={{ color: "var(--text-primary)" }}>{counts.total}</strong> elegíveis
        </span>
        <span>·</span>
        <span>{counts.confirmed} presentes</span>
        <span>·</span>
        <span>{counts.pending} marcaram Vou</span>
        <span>·</span>
        <span>{counts.noRsvp} sem pré-confirmação</span>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Pesquisar aluno</span>
        <input
          type="search"
          className="input"
          placeholder="Nome ou email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {filterBtn("all", "Todos")}
        {filterBtn("no_rsvp", "Sem pré-confirmação")}
        {filterBtn("pending", "Marcaram Vou")}
      </div>

      {filtered.length === 0 ? (
        <div className="coach-aula-empty-list">
          <span className="coach-aula-empty-icon" aria-hidden>
            👥
          </span>
          <p>Nenhum aluno encontrado com estes filtros.</p>
          <p className="coach-aula-empty-hint">
            A lista inclui alunos ativos da escola elegíveis para esta modalidade (ou todas, no plano FULL).
          </p>
        </div>
      ) : (
        <ul className="coach-aula-attendance-list" role="list">
          {filtered.map((s) => (
            <AttendanceRow
              key={s.studentId}
              attendanceId={s.attendanceId}
              studentId={s.studentId}
              studentName={s.name}
              studentEmail={s.email}
              status={s.status}
              checkedInAt={s.checkedInAt}
              lessonId={lessonId}
              occurrenceDate={occurrenceDate}
              modality={modality}
              evaluationConfig={evaluationConfig}
              evaluatedInThisLesson={s.evaluatedInThisLesson}
              lastEvalScoresByModality={s.lastEvalScoresByModality}
              preLessonWellness={s.preLessonWellness}
              rpe={s.rpe}
              rpeRecordedAt={s.rpeRecordedAt}
              profile={{
                name: s.name,
                email: s.email,
                avatarUrl: s.avatarUrl,
                phone: s.phone,
                weightKg: s.weightKg,
                heightCm: s.heightCm,
                medicalNotes: s.medicalNotes,
                emergencyContact: s.emergencyContact,
              }}
              canEvaluate={canEvaluate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
