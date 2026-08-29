"use client";

import { useState, useMemo, useEffect } from "react";
import { useFormState } from "react-dom";
import { submitTrialRequest, type SubmitTrialResult } from "./actions";

type ModalityOption = { value: string; label: string };
type LessonSlot = { id: string; occurrenceDate: string; label: string };

export function FormularioExperimental({
  schools,
  defaultSchoolId,
  modalityOptions,
  lessonsBySchoolId,
}: {
  schools: { id: string; name: string }[];
  defaultSchoolId?: string;
  modalityOptions: ModalityOption[];
  lessonsBySchoolId: Record<string, Record<string, LessonSlot[]>>;
}) {
  const [state, formAction] = useFormState(submitTrialRequest, null as SubmitTrialResult | null);
  const [schoolId, setSchoolId] = useState(defaultSchoolId || schools[0]?.id || "");
  const [selectedModality, setSelectedModality] = useState<string>("");

  const modalitiesForSchool = useMemo(() => {
    if (!schoolId) return [];
    const byMod = lessonsBySchoolId[schoolId] ?? {};
    return modalityOptions.filter((o) => (byMod[o.value] ?? []).length > 0);
  }, [schoolId, lessonsBySchoolId, modalityOptions]);

  useEffect(() => {
    const first = modalitiesForSchool[0]?.value ?? "";
    setSelectedModality(first);
  }, [schoolId, modalitiesForSchool]);

  const slotsForModality = useMemo(() => {
    if (!schoolId || !selectedModality) return [];
    return lessonsBySchoolId[schoolId]?.[selectedModality] ?? [];
  }, [schoolId, selectedModality, lessonsBySchoolId]);

  const hasSlots = slotsForModality.length > 0;

  return (
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 4vw, 20px)",
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Local / escola *
        </span>
        <select
          name="schoolId"
          required
          className="input"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          aria-label="Escola ou local"
        >
          {schools.length === 0 ? (
            <option value="">— Nenhuma escola disponível —</option>
          ) : (
            schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nome *
        </span>
        <input type="text" name="name" required className="input" placeholder="O teu nome" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Telefone *
        </span>
        <input
          type="tel"
          name="contact"
          required
          className="input"
          placeholder="+351 912 345 678"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Modalidade *
        </span>
        <select
          name="modality"
          required
          className="input"
          value={selectedModality}
          onChange={(e) => setSelectedModality(e.target.value)}
          disabled={modalitiesForSchool.length === 0}
        >
          {modalitiesForSchool.length === 0 ? (
            <option value="">— Escolhe um local com aulas —</option>
          ) : (
            modalitiesForSchool.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          )}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Data e hora desejada *
        </span>
        {hasSlots ? (
          <select name="lessonSlot" required className="input">
            <option value="">— Escolhe uma aula —</option>
            {slotsForModality.map((slot) => (
              <option key={`${slot.id}::${slot.occurrenceDate}`} value={`${slot.id}::${slot.occurrenceDate}`}>
                {slot.label}
              </option>
            ))}
          </select>
        ) : (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-secondary)",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "var(--text-secondary)",
            }}
          >
            Sem aulas disponíveis para esta modalidade neste local nos próximos tempos. Entra em contacto para combinarmos uma
            data.
          </div>
        )}
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={!hasSlots || !schoolId}>
        Enviar pedido
      </button>
    </form>
  );
}
