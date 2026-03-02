"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { createUnit, updateUnit, type UnitFormResult } from "./actions";

type Props = {
  courseId: string;
  moduleId: string;
  unitId?: string;
  initialName?: string;
  initialDescription?: string;
  initialContentType?: "VIDEO" | "TEXT";
  initialVideoUrl?: string;
  initialTextContent?: string;
  initialSortOrder?: number;
};

export function UnitForm({
  courseId,
  moduleId,
  unitId,
  initialName = "",
  initialDescription = "",
  initialContentType = "VIDEO",
  initialVideoUrl = "",
  initialTextContent = "",
  initialSortOrder = 0,
}: Props) {
  const router = useRouter();
  const [contentType, setContentType] = useState<"VIDEO" | "TEXT">(initialContentType);
  const action = unitId ? updateUnit : createUnit;
  const [state, formAction] = useFormState(action, null as UnitFormResult | null);

  useEffect(() => {
    if (state && !state.error) router.refresh();
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      {unitId && <input type="hidden" name="unitId" value={unitId} />}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Nome da unidade</span>
        <input type="text" name="name" defaultValue={initialName} className="input" placeholder="Ex.: Vídeo 1 - Técnica básica" required />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Descrição (opcional)</span>
        <textarea name="description" defaultValue={initialDescription} className="input" rows={2} style={{ resize: "vertical" }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Tipo de conteúdo</span>
        <select
          name="contentType"
          className="input"
          value={contentType}
          onChange={(e) => setContentType(e.target.value as "VIDEO" | "TEXT")}
        >
          <option value="VIDEO">Vídeo</option>
          <option value="TEXT">Texto para leitura</option>
        </select>
      </label>
      {contentType === "VIDEO" && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>URL do vídeo</span>
          <input type="url" name="videoUrl" defaultValue={initialVideoUrl} className="input" placeholder="https://..." />
        </label>
      )}
      {contentType === "TEXT" && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Texto complementar</span>
          <textarea name="textContent" defaultValue={initialTextContent} className="input" rows={6} style={{ resize: "vertical" }} placeholder="Conteúdo para leitura..." />
        </label>
      )}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Ordem</span>
        <input type="number" name="sortOrder" defaultValue={initialSortOrder} className="input" min={0} step={1} />
      </label>
      {state?.error && <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        {unitId ? "Guardar" : "Adicionar unidade"}
      </button>
    </form>
  );
}
