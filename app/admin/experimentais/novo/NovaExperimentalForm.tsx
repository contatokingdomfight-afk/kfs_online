"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { createTrialClass, type CreateTrialResult } from "../actions";

type LessonOption = { id: string; label: string };

const MODALITY_OPTIONS = [
  { value: "MUAY_THAI", label: "Muay Thai" },
  { value: "BOXING", label: "Boxing" },
  { value: "KICKBOXING", label: "Kickboxing" },
];

export function NovaExperimentalForm({ lessonOptions }: { lessonOptions: LessonOption[] }) {
  const [state, formAction] = useFormState(createTrialClass, null as CreateTrialResult | null);

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
        <input type="text" name="name" required className="input" placeholder="Nome completo" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Contacto (email ou telefone) *
        </span>
        <input type="text" name="contact" required className="input" placeholder="email@exemplo.com ou +351..." />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Modalidade *
        </span>
        <select name="modality" required className="input">
          {MODALITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Data da aula *
        </span>
        <input type="date" name="lessonDate" required className="input" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Aula específica (opcional)
        </span>
        <select name="lessonId" className="input">
          <option value="">— Não associar a uma aula —</option>
          {lessonOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
        <Link href="/admin/experimentais" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
