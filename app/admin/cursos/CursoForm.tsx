"use client";

import { useFormState } from "react-dom";
import { createCourse, updateCourse, type CourseFormResult } from "./actions";

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

type Props = {
  courseId?: string;
  initialName?: string;
  initialDescription?: string;
  initialCategory?: string;
  initialModality?: string | null;
  initialIncludedInDigital?: boolean;
  initialVideoUrl?: string | null;
  initialSortOrder?: number;
  initialIsActive?: boolean;
  initialPrice?: number | null;
  initialAvailableForPurchase?: boolean;
};

export function CursoForm({
  courseId,
  initialName = "",
  initialDescription = "",
  initialCategory = "TECHNIQUE",
  initialModality = null,
  initialIncludedInDigital = true,
  initialVideoUrl = "",
  initialSortOrder = 0,
  initialIsActive = true,
  initialPrice = null,
  initialAvailableForPurchase = false,
}: Props) {
  const action = courseId ? updateCourse : createCourse;
  const [state, formAction] = useFormState(action, null as CourseFormResult | null);

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
          Nome do curso
        </span>
        <input
          type="text"
          name="name"
          defaultValue={initialName}
          className="input"
          placeholder="Ex.: Base do Muay Thai"
          required
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Descrição
        </span>
        <textarea
          name="description"
          defaultValue={initialDescription}
          className="input"
          placeholder="Breve descrição do conteúdo"
          rows={3}
          style={{ resize: "vertical" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Categoria
        </span>
        <select name="category" className="input" defaultValue={initialCategory}>
          {CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Modalidade (opcional)
        </span>
        <select name="modality" className="input" defaultValue={initialModality ?? ""}>
          {MODALITIES.map(({ value, label }) => (
            <option key={value || "any"} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          URL do vídeo
        </span>
        <input
          type="url"
          name="video_url"
          defaultValue={initialVideoUrl ?? ""}
          className="input"
          placeholder="https://..."
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Ordem de exibição (número)
        </span>
        <input
          type="number"
          name="sort_order"
          defaultValue={initialSortOrder}
          className="input"
          min={0}
          step={1}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          Preço compra avulsa (€) — opcional
        </span>
        <input
          type="number"
          name="price"
          defaultValue={initialPrice ?? ""}
          className="input"
          placeholder="Ex.: 29"
          min={0}
          step={0.01}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          name="available_for_purchase"
          defaultChecked={initialAvailableForPurchase}
          value="on"
        />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Disponível para compra avulsa (quem não tem plano digital pode comprar)
        </span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          name="included_in_digital_plan"
          defaultChecked={initialIncludedInDigital}
          value="on"
        />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Incluído no plano digital (alunos com plano que inclui digital têm acesso)
        </span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" name="is_active" defaultChecked={initialIsActive} value="on" />
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
          Curso ativo (visível na biblioteca)
        </span>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        {courseId ? "Guardar" : "Criar curso"}
      </button>
    </form>
  );
}
