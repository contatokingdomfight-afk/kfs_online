"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createCriterion,
  updateCriterion,
  deleteCriterion,
  createComponent,
  deleteComponent,
  type CriterionResult,
  type ComponentResult,
} from "./actions";

function FormSavingBar({ label = "A guardar…" }: { label?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div role="status" aria-live="polite" style={{ marginBottom: "var(--space-2)" }}>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          className="animate-loading-bar"
          style={{ height: "100%", width: "38%", background: "var(--primary)", borderRadius: 2 }}
        />
      </div>
      <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{label}</p>
    </div>
  );
}

function AddCriterionActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <>
      <FormSavingBar />
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }} disabled={pending}>
          {pending ? "A guardar…" : "Adicionar critério"}
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} disabled={pending} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </>
  );
}

function EditCriterionActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <>
      <FormSavingBar />
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }} disabled={pending}>
          {pending ? "A guardar…" : "Guardar"}
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} disabled={pending} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </>
  );
}

function DeleteCriterionSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-secondary"
      style={{ fontSize: "var(--text-xs)", padding: "0.3em 0.6em", color: "var(--danger)" }}
      disabled={pending}
    >
      {pending ? "A remover…" : "Remover"}
    </button>
  );
}

function DeleteCriterionForm({ criterionId }: { criterionId: string }) {
  const [deleteState, deleteAction] = useFormState(deleteCriterion, null);
  return (
    <form action={deleteAction} style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <input type="hidden" name="criterionId" value={criterionId} />
      <DeleteCriterionSubmitButton />
      {deleteState?.error && <span style={{ color: "var(--danger)", fontSize: "var(--text-xs)" }}>{deleteState.error}</span>}
    </form>
  );
}

export type ComponentBlock = {
  componentId: string;
  componentName: string;
  componentSortOrder: number;
  criteria: { id: string; label: string; description: string | null; sortOrder: number }[];
};

export type DimensionBlock = {
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  dimensionSortOrder: number;
  components: ComponentBlock[];
};

export type OtherModalityData = {
  code: string;
  name: string;
  components: { componentId: string; componentName: string }[];
};

type Props = {
  modality: string;
  modalityLabel: string;
  dimensionBlocks: DimensionBlock[];
  otherModalities?: OtherModalityData[];
};

export function ModalityCriteriaManager({ modality, modalityLabel, dimensionBlocks, otherModalities = [] }: Props) {
  const [addingCriterionTo, setAddingCriterionTo] = useState<string | null>(null);
  const [newCriterionLabel, setNewCriterionLabel] = useState("");
  const [newCriterionDescription, setNewCriterionDescription] = useState("");
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editCriterionLabel, setEditCriterionLabel] = useState("");
  const [editCriterionDescription, setEditCriterionDescription] = useState("");

  // Estado para replicação em outras modalidades: modalityCode → componentId escolhido
  const [selectedExtra, setSelectedExtra] = useState<Record<string, string>>({});

  // Estado para adicionar sub-categoria (componente dentro de uma dimensão)
  const [addingSubCompToDimension, setAddingSubCompToDimension] = useState<string | null>(null);
  const [newSubCompName, setNewSubCompName] = useState("");

  // Estado para adicionar categoria autónoma (sem dimensão)
  const [addingStandaloneComp, setAddingStandaloneComp] = useState(false);
  const [newStandaloneCompName, setNewStandaloneCompName] = useState("");

  const [critState, critAction] = useFormState(createCriterion, null as CriterionResult | null);
  const [critUpdateState, critUpdateAction] = useFormState(updateCriterion, null as CriterionResult | null);
  const [compState, compAction] = useFormState(createComponent, null as ComponentResult | null);
  const [deleteCompState, deleteCompAction] = useFormState(deleteComponent, null as ComponentResult | null);

  useEffect(() => {
    if (critState?.success) {
      setAddingCriterionTo(null);
      setNewCriterionLabel("");
      setNewCriterionDescription("");
      setSelectedExtra({});
    }
  }, [critState]);

  useEffect(() => {
    if (critUpdateState?.success) {
      setEditingCriterion(null);
      setEditCriterionLabel("");
      setEditCriterionDescription("");
    }
  }, [critUpdateState]);

  useEffect(() => {
    if (compState?.success) {
      setAddingSubCompToDimension(null);
      setNewSubCompName("");
      setAddingStandaloneComp(false);
      setNewStandaloneCompName("");
    }
  }, [compState]);

  const toggleExtraModality = (modalityCode: string, checked: boolean, currentCompName: string) => {
    setSelectedExtra((prev) => {
      if (!checked) {
        const next = { ...prev };
        delete next[modalityCode];
        return next;
      }
      const mod = otherModalities.find((m) => m.code === modalityCode);
      const match = mod?.components.find((c) => c.componentName === currentCompName);
      const defaultId = match?.componentId ?? mod?.components[0]?.componentId ?? "";
      return { ...prev, [modalityCode]: defaultId };
    });
  };

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

          {block.components.length === 0 && (
            <p style={{ margin: "0 0 var(--space-3) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Nenhuma sub-categoria configurada para esta dimensão.
            </p>
          )}

          {block.components.map((comp, compIdx) => (
            <div
              key={comp.componentId}
              style={{
                marginTop: compIdx === 0 ? 0 : "var(--space-4)",
                paddingTop: compIdx === 0 ? 0 : "var(--space-4)",
                borderTop: compIdx === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              {comp.componentName !== block.dimensionName && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {comp.componentName}
                  </p>
                  <form action={deleteCompAction} style={{ display: "inline-flex" }}>
                    <input type="hidden" name="componentId" value={comp.componentId} />
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      style={{ fontSize: "var(--text-xs)", padding: "0.2em 0.5em", color: "var(--danger)" }}
                      onClick={(e) => {
                        if (!confirm(`Apagar sub-categoria "${comp.componentName}" e todos os seus critérios?`)) e.preventDefault();
                      }}
                    >
                      Apagar
                    </button>
                  </form>
                </div>
              )}

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {comp.criteria.map((c) => (
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
                        action={critUpdateAction}
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
                        <EditCriterionActions onCancel={() => setEditingCriterion(null)} />
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
                            <DeleteCriterionForm criterionId={c.id} />
                          </div>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {addingCriterionTo === comp.componentId ? (
                <form
                  action={critAction}
                  style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
                >
                  <input type="hidden" name="componentId" value={comp.componentId} />
                  <input
                    type="hidden"
                    name="extraComponentIds"
                    value={Object.values(selectedExtra).filter(Boolean).join(",")}
                  />
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

                  {otherModalities.length > 0 && (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "var(--space-3)",
                        background: "var(--bg)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Adicionar também em
                      </p>
                      {otherModalities.map((mod) => {
                        const isChecked = mod.code in selectedExtra;
                        return (
                          <div key={mod.code} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--text-primary)", minWidth: 120 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => toggleExtraModality(mod.code, e.target.checked, comp.componentName)}
                                style={{ accentColor: "var(--primary)", width: 15, height: 15, flexShrink: 0 }}
                              />
                              {mod.name}
                            </label>
                            {isChecked && (
                              <select
                                className="input"
                                value={selectedExtra[mod.code] ?? ""}
                                onChange={(e) => setSelectedExtra((prev) => ({ ...prev, [mod.code]: e.target.value }))}
                                style={{ fontSize: "var(--text-xs)", padding: "0.25em 0.5em", flex: 1, minWidth: 160 }}
                              >
                                {mod.components.map((c) => (
                                  <option key={c.componentId} value={c.componentId}>
                                    {c.componentName}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <AddCriterionActions
                    onCancel={() => {
                      setAddingCriterionTo(null);
                      setNewCriterionLabel("");
                      setNewCriterionDescription("");
                      setSelectedExtra({});
                    }}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}
                  onClick={() => setAddingCriterionTo(comp.componentId)}
                >
                  + Adicionar critério a {comp.componentName}
                </button>
              )}
            </div>
          ))}

          {/* Nova sub-categoria dentro desta dimensão */}
          {addingSubCompToDimension === block.dimensionId ? (
            <form
              action={compAction}
              style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
            >
              <input type="hidden" name="modality" value={modality} />
              <input type="hidden" name="dimensionId" value={block.dimensionId} />
              <input
                type="text"
                name="name"
                className="input"
                value={newSubCompName}
                onChange={(e) => setNewSubCompName(e.target.value)}
                placeholder={`Ex: Variações de ${block.dimensionName}, Técnicas avançadas…`}
                required
                style={{ fontSize: "var(--text-sm)" }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>
                  Criar sub-categoria
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }}
                  onClick={() => { setAddingSubCompToDimension(null); setNewSubCompName(""); }}>
                  Cancelar
                </button>
              </div>
              {compState?.error && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>{compState.error}</p>}
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", borderStyle: "dashed" }}
              onClick={() => { setAddingSubCompToDimension(block.dimensionId); setAddingStandaloneComp(false); }}
            >
              + Nova sub-categoria em {block.dimensionName}
            </button>
          )}
        </div>
      ))}

      {/* Botão / form para nova categoria autónoma (sem dimensão) */}
      <div
        className="card"
        style={{ padding: "var(--space-4)", borderStyle: "dashed" }}
      >
        {addingStandaloneComp ? (
          <form
            action={compAction}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
          >
            <input type="hidden" name="modality" value={modality} />
            <p style={{ margin: "0 0 var(--space-1) 0", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
              Nova categoria
            </p>
            <input
              type="text"
              name="name"
              className="input"
              value={newStandaloneCompName}
              onChange={(e) => setNewStandaloneCompName(e.target.value)}
              placeholder="Ex: Grappling, Clínch avançado, Psicologia de luta…"
              required
              style={{ fontSize: "var(--text-sm)" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }}>
                Criar categoria
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }}
                onClick={() => { setAddingStandaloneComp(false); setNewStandaloneCompName(""); }}>
                Cancelar
              </button>
            </div>
            {compState?.error && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>{compState.error}</p>}
          </form>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "var(--text-sm)", width: "100%" }}
            onClick={() => { setAddingStandaloneComp(true); setAddingSubCompToDimension(null); }}
          >
            + Adicionar nova categoria
          </button>
        )}
      </div>

      {(critState?.error || critUpdateState?.error || deleteCompState?.error) && (
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {critState?.error ?? critUpdateState?.error ?? deleteCompState?.error}
        </p>
      )}
    </div>
  );
}
