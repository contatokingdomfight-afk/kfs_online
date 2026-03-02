"use client";

import { useFormState } from "react-dom";
import { createCoachCourse, updateCoachCourse, type CoachCourseFormResult } from "./actions";

const CATEGORIES = [
  { value: "TECHNIQUE", label: "Técnica" },
  { value: "MINDSET", label: "Mindset e História" },
  { value: "PERFORMANCE", label: "Performance" },
] as const;

const MODALITIES = [
  { value: "", label: "— Qualquer / Geral" },
  { value: "MUAY_THAI", label: "Muay Thai" },
  { value: "BOXING", label: "Boxing" },
  { value: "KICKBOXING", label: "Kickboxing" },
] as const;

const LEVELS = [
  { value: "", label: "— Qualquer nível" },
  { value: "INICIANTE", label: "Iniciante" },
  { value: "INTERMEDIARIO", label: "Intermediário" },
  { value: "AVANCADO", label: "Avançado" },
] as const;

type Props = {
  courseId?: string;
  initialName?: string;
  initialDescription?: string;
  initialCategory?: string;
  initialModality?: string | null;
  initialLevel?: string | null;
  initialPrice?: number | null;
  initialAvailableForPurchase?: boolean;
};

export function CoachCursoForm({
  courseId,
  initialName = "",
  initialDescription = "",
  initialCategory = "TECHNIQUE",
  initialModality = null,
  initialLevel = null,
  initialPrice = null,
  initialAvailableForPurchase = true,
}: Props) {
  const action = courseId ? updateCoachCourse : createCoachCourse;
  const [state, formAction] = useFormState(action, null as CoachCourseFormResult | null);

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
      {courseId && <input type="hidden" name="courseId" value={courseId} />}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nome do curso *
        </span>
        <input type="text" name="name" defaultValue={initialName} className="input" placeholder="Ex.: Fundamentos do Muay Thai" required />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Descrição
        </span>
        <textarea
          name="description"
          defaultValue={initialDescription}
          className="input"
          placeholder="O que o aluno vai aprender neste curso?"
          rows={3}
          style={{ resize: "vertical" }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Categoria
        </span>
        <select name="category" className="input" defaultValue={initialCategory}>
          {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Modalidade (opcional)
        </span>
        <select name="modality" className="input" defaultValue={initialModality ?? ""}>
          {MODALITIES.map(({ value, label }) => <option key={value || "any"} value={value}>{label}</option>)}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Nível (opcional)
        </span>
        <select name="level" className="input" defaultValue={initialLevel ?? ""}>
          {LEVELS.map(({ value, label }) => <option key={value || "any"} value={value}>{label}</option>)}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Preço (€) *
        </span>
        <input
          type="number"
          name="price"
          defaultValue={initialPrice ?? ""}
          className="input"
          placeholder="Ex.: 29"
          min={1}
          step={1}
          required
        />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Tu recebes 65% · KFS recebe 35%
        </span>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" name="available_for_purchase" defaultChecked={initialAvailableForPurchase} value="on" />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Disponível para compra avulsa
        </span>
      </label>

      <div style={{ padding: "clamp(12px, 3vw, 14px)", background: "var(--surface)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-secondary)" }}>
        O curso ficará em revisão após a criação. O administrador da KFS irá ativá-lo após verificação.
      </div>

      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
      )}
      {state && !state.error && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--success)" }}>Guardado com sucesso!</p>
      )}
      <button type="submit" className="btn btn-primary">
        {courseId ? "Guardar alterações" : "Criar curso"}
      </button>
    </form>
  );
}
