"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  createCriterion,
  updateCriterion,
  deleteCriterion,
  type CriterionResult,
} from "./actions";

export type DimensionBlock = {
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  dimensionSortOrder: number;
  componentId: string | null;
  criteria: { id: string; label: string; description: string | null; sortOrder: number }[];
};

type Props = {
  modality: string;
  modalityLabel: string;
  dimensionBlocks: DimensionBlock[];
};

export function ModalityCriteriaManager({ modality, modalityLabel, dimensionBlocks }: Props) {
  const [addingCriterionTo, setAddingCriterionTo] = useState<string | null>(null);
  const [newCriterionLabel, setNewCriterionLabel] = useState("");
  const [newCriterionDescription, setNewCriterionDescription] = useState("");
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editCriterionLabel, setEditCriterionLabel] = useState("");
  const [editCriterionDescription, setEditCriterionDescription] = useState("");

  const [critState, critAction] = useFormState(createCriterion, null as CriterionResult | null);
  const [critUpdateState, critUpdateAction] = useFormState(updateCriterion, null as CriterionResult | null);

  const startEditCriterion = (c: { id: string; label: string; description: string | null }) => {
    setEditingCriterion(c.id);
    setEditCriterionLabel(c.label);
    setEditCriterionDescription(c.description ?? "");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
        As <strong>componentes gerais</strong> (Técnico, Tático, Físico, Mental, Teórico e outras que adicionares em Componentes gerais) são padrão. Em cada uma, configura os critérios que o treinador usa ao avaliar nesta modalidade ({modalityLabel}).
      </p>

      {dimensionBlocks.map((block) => (
        <div
          key={block.dimensionId}
          className="card"
          style={{ padding: "var(--space-4)" }}
        >
          <h3 style={{ margin: "0 0 var(--space-3) 0", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
            {block.dimensionName}
          </h3>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {block.criteria.map((c) => (
              <li
                key={c.id}
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {editingCriterion === c.id ? (
                  <form
                    action={(fd) => {
                      critUpdateAction(fd);
                      setEditingCriterion(null);
                    }}
                    style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
                  >
                    <input type="hidden" name="criterionId" value={c.id} />
                    <input
                      type="text"
                      name="label"
                      className="input"
                      value={editCriterionLabel}
                      onChange={(e) => setEditCriterionLabel(e.target.value)}
                      placeholder="Designação"
                      required
                      style={{ fontSize: "var(--text-sm)" }}
                    />
                    <textarea
                      name="description"
                      className="input"
                      value={editCriterionDescription}
                      onChange={(e) => setEditCriterionDescription(e.target.value)}
                      placeholder="Descrição do que está a ser avaliado"
                      rows={2}
                      style={{ fontSize: "var(--text-sm)", resize: "vertical" }}
                    />
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>
                        Guardar
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={() => setEditingCriterion(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>{c.label}</span>
                        {c.description && (
                          <p style={{ margin: "4px 0 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            {c.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-xs)", padding: "0.3em 0.6em" }} onClick={() => startEditCriterion(c)}>
                          Editar
                        </button>
                        <form action={deleteCriterion} style={{ display: "inline" }}>
                          <input type="hidden" name="criterionId" value={c.id} />
                          <button type="submit" className="btn btn-secondary" style={{ fontSize: "var(--text-xs)", padding: "0.3em 0.6em", color: "var(--danger)" }}>
                            Remover
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          {addingCriterionTo === block.dimensionId ? (
            <form
              action={(fd) => {
                critAction(fd);
                setAddingCriterionTo(null);
                setNewCriterionLabel("");
                setNewCriterionDescription("");
              }}
              style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
            >
              {block.componentId ? (
                <input type="hidden" name="componentId" value={block.componentId} />
              ) : (
                <>
                  <input type="hidden" name="modality" value={modality} />
                  <input type="hidden" name="dimensionId" value={block.dimensionId} />
                </>
              )}
              <input
                type="text"
                name="label"
                className="input"
                value={newCriterionLabel}
                onChange={(e) => setNewCriterionLabel(e.target.value)}
                placeholder="Ex: Jab, Defesa, Resistência..."
                required
                style={{ fontSize: "var(--text-sm)" }}
              />
              <textarea
                name="description"
                className="input"
                value={newCriterionDescription}
                onChange={(e) => setNewCriterionDescription(e.target.value)}
                placeholder="Ex: O aluno está a aplicar o jab corretamente"
                rows={2}
                style={{ fontSize: "var(--text-sm)", resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>
                  Adicionar critério
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={() => { setAddingCriterionTo(null); setNewCriterionLabel(""); setNewCriterionDescription(""); }}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}
              onClick={() => setAddingCriterionTo(block.dimensionId)}
            >
              + Adicionar critério a {block.dimensionName}
            </button>
          )}
        </div>
      ))}

      {(critState?.error || critUpdateState?.error) && (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {critState?.error ?? critUpdateState?.error}
        </p>
      )}
    </div>
  );
}
