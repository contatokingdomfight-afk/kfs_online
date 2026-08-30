"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { createUnit, updateUnit, type UnitFormResult } from "./actions";
import { FormLoadingBar } from "@/components/FormLoadingBar";

type Props = {
  courseId: string;
  moduleId: string;
  unitId?: string;
  initialName?: string;
  initialDescription?: string;
  initialContentType?: "VIDEO" | "TEXT" | "PDF";
  initialVideoUrl?: string;
  initialTextContent?: string;
  initialPdfUrl?: string;
  initialSortOrder?: number;
  initialStatus?: "DRAFT" | "PUBLISHED";
  onSuccess?: () => void;
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
  initialPdfUrl = "",
  initialSortOrder = 0,
  initialStatus = "PUBLISHED",
  onSuccess,
}: Props) {
  const router = useRouter();
  const [contentType, setContentType] = useState<"VIDEO" | "TEXT" | "PDF">(initialContentType);
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const action = unitId ? updateUnit : createUnit;
  const [state, formAction] = useFormState(action, null as UnitFormResult | null);

  async function handlePdfSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("courseId", courseId);
      body.append("moduleId", moduleId);
      const res = await fetch("/api/coach/course-unit-pdf", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error ?? "Falha ao enviar o ficheiro.");
        return;
      }
      setPdfUrl(json.url);
    } catch {
      setUploadError("Falha ao enviar o ficheiro.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (state && !state.error) {
      onSuccess?.();
      router.refresh();
    }
  }, [state, router, onSuccess]);

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
      <FormLoadingBar message={unitId ? "A guardar…" : "A adicionar unidade…"} />
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
          onChange={(e) => setContentType(e.target.value as "VIDEO" | "TEXT" | "PDF")}
        >
          <option value="VIDEO">Vídeo</option>
          <option value="TEXT">Texto para leitura (Markdown)</option>
          <option value="PDF">PDF</option>
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
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Texto complementar (aceita Markdown: # títulos, **negrito**, listas)</span>
          <textarea name="textContent" defaultValue={initialTextContent} className="input" rows={6} style={{ resize: "vertical" }} placeholder="Conteúdo para leitura..." />
        </label>
      )}
      {contentType === "PDF" && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Ficheiro PDF (máx. 4 MB)</span>
          <input type="file" accept="application/pdf" onChange={handlePdfSelected} className="input" />
          {uploading && <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>A carregar…</span>}
          {!uploading && pdfUrl && <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>✓ PDF carregado</span>}
          {uploadError && <span style={{ fontSize: 13, color: "var(--danger)" }}>{uploadError}</span>}
          <input type="hidden" name="pdfUrl" value={pdfUrl} />
        </label>
      )}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Ordem</span>
        <input type="number" name="sortOrder" defaultValue={initialSortOrder} className="input" min={0} step={1} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" name="status" value="DRAFT" defaultChecked={initialStatus === "DRAFT"} />
        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
          Guardar como rascunho (visível só para admins)
        </span>
      </label>
      {state?.error && <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        {unitId ? "Guardar" : "Adicionar unidade"}
      </button>
    </form>
  );
}
