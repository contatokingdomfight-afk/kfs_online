"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { createModule, updateModule, type ModuleFormResult } from "./actions";

type Props = {
  courseId: string;
  moduleId?: string;
  initialName?: string;
  initialDescription?: string;
  initialSortOrder?: number;
  onSuccess?: () => void;
};

export function ModuleForm({
  courseId,
  moduleId,
  initialName = "",
  initialDescription = "",
  initialSortOrder = 0,
}: Props) {
  const router = useRouter();
  const action = moduleId ? updateModule : createModule;
  const [state, formAction] = useFormState(action, null as ModuleFormResult | null);

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
      {moduleId && <input type="hidden" name="moduleId" value={moduleId} />}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Nome do módulo</span>
        <input type="text" name="name" defaultValue={initialName} className="input" placeholder="Ex.: Aula 1 - Fundamentos" required />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Descrição (opcional)</span>
        <textarea name="description" defaultValue={initialDescription} className="input" rows={2} style={{ resize: "vertical" }} />
      </label>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
        Após criar o módulo, adicione unidades (vídeo ou texto) dentro dele.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Ordem</span>
        <input type="number" name="sortOrder" defaultValue={initialSortOrder} className="input" min={0} step={1} />
      </label>
      {state?.error && <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        {moduleId ? "Guardar" : "Adicionar módulo"}
      </button>
    </form>
  );
}
