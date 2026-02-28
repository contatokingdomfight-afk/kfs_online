"use client";

import { useState, useEffect } from "react";
import { useFormState } from "react-dom";
import { saveModalityEvaluationConfig } from "./actions";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModal";
import { parseConfig } from "@/lib/evaluation-config";

function newCriterionId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type CriterionEdit = { id: string; label: string };
type CategoryEdit = { nome: string; criterios: CriterionEdit[] };

function buildInitialState(initialConfig: string): CategoryEdit[] {
  if (!initialConfig?.trim()) {
    return [{ nome: "", criterios: [{ id: newCriterionId(), label: "" }] }];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(initialConfig);
  } catch {
    return [{ nome: "", criterios: [{ id: newCriterionId(), label: "" }] }];
  }
  const config = parseConfig(parsed);
  if (!config || config.categorias.length === 0) {
    return [{ nome: "", criterios: [{ id: newCriterionId(), label: "" }] }];
  }
  return config.categorias.map((cat) => ({
    nome: cat.nome,
    criterios: cat.criterios.map((c) => ({ id: c.id, label: c.label })),
  }));
}

type Props = { modality: string; initialConfig: string };

export function CriteriosAvaliacaoForm({ modality, initialConfig }: Props) {
  const [categorias, setCategorias] = useState<CategoryEdit[]>(() => buildInitialState(initialConfig));
  const [successDismissed, setSuccessDismissed] = useState(false);
  const [state, formAction] = useFormState(saveModalityEvaluationConfig, null as { error?: string; success?: boolean } | null);

  useEffect(() => {
    setCategorias(buildInitialState(initialConfig));
  }, [modality, initialConfig]);

  const addCategory = () => {
    setCategorias((prev) => [...prev, { nome: "", criterios: [{ id: newCriterionId(), label: "" }] }]);
  };

  const removeCategory = (index: number) => {
    setCategorias((prev) => prev.filter((_, i) => i !== index));
  };

  const setCategoryName = (index: number, nome: string) => {
    setCategorias((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], nome };
      return next;
    });
  };

  const addCriterion = (catIndex: number) => {
    setCategorias((prev) => {
      const next = [...prev];
      next[catIndex] = {
        ...next[catIndex],
        criterios: [...next[catIndex].criterios, { id: newCriterionId(), label: "" }],
      };
      return next;
    });
  };

  const removeCriterion = (catIndex: number, critIndex: number) => {
    setCategorias((prev) => {
      const next = [...prev];
      next[catIndex] = {
        ...next[catIndex],
        criterios: next[catIndex].criterios.filter((_, i) => i !== critIndex),
      };
      return next;
    });
  };

  const setCriterionLabel = (catIndex: number, critIndex: number, label: string) => {
    setCategorias((prev) => {
      const next = [...prev];
      const crits = [...next[catIndex].criterios];
      crits[critIndex] = { ...crits[critIndex], label };
      next[catIndex] = { ...next[catIndex], criterios: crits };
      return next;
    });
  };

  const buildConfigJson = (): string => {
    const config = {
      categorias: categorias
        .filter((cat) => cat.criterios.some((c) => c.label.trim() !== ""))
        .map((cat) => ({
          nome: cat.nome.trim() || "Categoria",
          criterios: cat.criterios
            .filter((c) => c.label.trim() !== "")
            .map((c) => ({ id: c.id, label: c.label.trim(), tipo: "range_1_10" as const })),
        }))
        .filter((cat) => cat.criterios.length > 0),
    };
    return JSON.stringify(config);
  };

  const showSuccess = Boolean(state?.success && !state?.error && !successDismissed);

  const handleSubmit = (formData: FormData) => {
    setSuccessDismissed(false);
    formData.set("modality", modality);
    formData.set("configJson", buildConfigJson());
    return formAction(formData);
  };

  return (
    <>
      <form
        action={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <input type="hidden" name="modality" value={modality} />

        {categorias.map((cat, catIndex) => (
          <div
            key={catIndex}
            style={{
              padding: "var(--space-4)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ marginBottom: "var(--space-3)" }}>
              <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                Nome da categoria
              </label>
              <input
                type="text"
                className="input"
                value={cat.nome}
                onChange={(e) => setCategoryName(catIndex, e.target.value)}
                placeholder="Ex: Técnico, Tático, Físico"
                style={{ width: "100%", maxWidth: 320 }}
              />
            </div>

            <div style={{ marginBottom: "var(--space-3)" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>
                Critérios (escala 1–10)
              </span>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.criterios.map((c, critIndex) => (
                  <li
                    key={c.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                  >
                    <input
                      type="text"
                      className="input"
                      value={c.label}
                      onChange={(e) => setCriterionLabel(catIndex, critIndex, e.target.value)}
                      placeholder="Nome do critério"
                      style={{ flex: "1 1 200px", minWidth: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(catIndex, critIndex)}
                      className="btn btn-secondary"
                      style={{ padding: "0.4em 0.8em", fontSize: "var(--text-sm)" }}
                      title="Remover critério"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => addCriterion(catIndex)}
                className="btn btn-secondary"
                style={{ marginTop: 8, fontSize: "var(--text-sm)" }}
              >
                + Adicionar critério
              </button>
            </div>

            {categorias.length > 1 && (
              <button
                type="button"
                onClick={() => removeCategory(catIndex)}
                style={{
                  marginTop: 8,
                  padding: "0.4em 0.8em",
                  fontSize: "var(--text-sm)",
                  color: "var(--danger)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Remover categoria
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addCategory} className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
          + Adicionar categoria
        </button>

        {state?.error && (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>{state.error}</p>
        )}
        <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
          Guardar critérios
        </button>
      </form>

      <SuccessConfirmModal
        open={showSuccess}
        onClose={() => setSuccessDismissed(true)}
        title="Guardado"
        message="Os critérios de avaliação foram atualizados."
        closeLabel="Fechar"
      />
    </>
  );
}
