"use client";

import { useState, useMemo } from "react";
import { useFormState } from "react-dom";
import { submitTrialRequest, type SubmitTrialResult } from "./actions";

type ModalityOption = { value: string; label: string };
type LessonSlot = { id: string; date: string; label: string };

export function FormularioExperimental({
  modalityOptions,
  lessonsByModality,
}: {
  modalityOptions: ModalityOption[];
  lessonsByModality: Record<string, LessonSlot[]>;
}) {
  const [state, formAction] = useFormState(submitTrialRequest, null as SubmitTrialResult | null);
  const [selectedModality, setSelectedModality] = useState<string>(modalityOptions[0]?.value ?? "");

  const slotsForModality = useMemo(
    () => (selectedModality ? lessonsByModality[selectedModality] ?? [] : []),
    [selectedModality, lessonsByModality]
  );
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
          Nome *
        </span>
        <input type="text" name="name" required className="input" placeholder="O teu nome" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Email ou telefone *
        </span>
        <input
          type="text"
          name="contact"
          required
          className="input"
          placeholder="email@exemplo.com ou +351..."
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
        >
          {modalityOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Data e hora desejada *
        </span>
        {hasSlots ? (
          <select name="lessonId" required className="input">
            <option value="">— Escolhe uma aula —</option>
            {slotsForModality.map((slot) => (
              <option key={slot.id} value={slot.id}>
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
            Sem aulas disponíveis para esta modalidade nos próximos tempos. Entra em contacto para combinarmos uma data.
          </div>
        )}
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={!hasSlots}>
        Enviar pedido
      </button>
    </form>
  );
}
