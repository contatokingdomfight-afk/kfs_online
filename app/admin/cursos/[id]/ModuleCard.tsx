"use client";

import { useState } from "react";
import { DeleteModuleButton } from "../modules/DeleteModuleButton";
import { DeleteUnitButton } from "../modules/units/DeleteUnitButton";
import { ModuleForm } from "../modules/ModuleForm";
import { UnitForm } from "../modules/units/UnitForm";
import { VideoPlayer } from "@/components/biblioteca/VideoPlayer";
import { ViewersDrilldown } from "./ViewersDrilldown";
import { getUnitViewers } from "../stats-actions";

type Unit = {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  content_type: string;
  video_url: string | null;
  text_content: string | null;
  sort_order: number;
  status: "DRAFT" | "PUBLISHED";
};

type Module = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: "DRAFT" | "PUBLISHED";
};

type Props = {
  courseId: string;
  module: Module;
  index: number;
  units: Unit[];
  viewCountByUnitId: Record<string, number>;
};

function DraftBadge() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--warning)",
        color: "var(--text-primary)",
        textTransform: "uppercase",
        letterSpacing: 0.3,
      }}
    >
      Rascunho
    </span>
  );
}

function UnitPreview({ unit }: { unit: Unit }) {
  if (unit.content_type === "VIDEO") {
    return unit.video_url ? (
      <div style={{ marginTop: 10 }}>
        <VideoPlayer url={unit.video_url} title={unit.name} autoLandscapeOnMobile={false} />
      </div>
    ) : (
      <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Sem URL de vídeo definida.</p>
    );
  }
  return unit.text_content ? (
    <div
      style={{
        marginTop: 10,
        padding: "clamp(12px, 3vw, 16px)",
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-md)",
        fontSize: 14,
        color: "var(--text-primary)",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}
    >
      {unit.text_content}
    </div>
  ) : (
    <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Sem texto definido.</p>
  );
}

export function ModuleCard({ courseId, module, index, units, viewCountByUnitId }: Props) {
  const [open, setOpen] = useState(true);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showEditModule, setShowEditModule] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [previewUnitId, setPreviewUnitId] = useState<string | null>(null);
  const [unitFormKey, setUnitFormKey] = useState(0);
  const [editFormKey, setEditFormKey] = useState(0);

  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "clamp(12px, 3vw, 16px)",
          background: "var(--surface)",
          cursor: "pointer",
          flexWrap: "wrap",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, color: "var(--text-secondary)" }}>{open ? "▼" : "▶"}</span>
          <span style={{ fontWeight: 600, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)" }}>
            Módulo {index + 1}: {module.name}
          </span>
          {module.status === "DRAFT" && <DraftBadge />}
          {units.length > 0 && (
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              ({units.length} {units.length === 1 ? "unidade" : "unidades"})
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: "6px 12px", minHeight: 36 }}
            onClick={() => {
              setShowEditModule((v) => !v);
              if (showAddUnit) setShowAddUnit(false);
              setOpen(true);
            }}
          >
            {showEditModule ? "Fechar edição" : "Editar módulo"}
          </button>
          <DeleteModuleButton moduleId={module.id} courseId={courseId} moduleName={module.name} />
        </div>
      </div>

      {open && (
        <div style={{ padding: "clamp(12px, 3vw, 16px)", borderTop: "1px solid var(--border, #e5e7eb)" }}>
          {showEditModule ? (
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Editar módulo
              </p>
              <ModuleForm
                key={editFormKey}
                courseId={courseId}
                moduleId={module.id}
                initialName={module.name}
                initialDescription={module.description ?? ""}
                initialSortOrder={module.sort_order}
                initialStatus={module.status}
                onSuccess={() => {
                  setShowEditModule(false);
                  setEditFormKey((k) => k + 1);
                }}
              />
            </div>
          ) : (
            module.description && (
              <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-secondary)" }}>{module.description}</p>
            )
          )}

          {!showEditModule && units.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
              {units.map((u, uIdx) => (
                <li
                  key={u.id}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontWeight: 500, fontSize: 14, color: "var(--text-primary)" }}>
                      {uIdx + 1}. {u.name}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {u.content_type === "VIDEO" ? "Vídeo" : "Texto"}
                    </span>
                    {u.status === "DRAFT" && <DraftBadge />}
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                      <ViewersDrilldown
                        label={`${viewCountByUnitId[u.id] ?? 0} ${(viewCountByUnitId[u.id] ?? 0) === 1 ? "concluiu" : "concluíram"}`}
                        fetchViewers={getUnitViewers.bind(null, u.id)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: "5px 10px", minHeight: 30 }}
                        onClick={() => {
                          setPreviewUnitId((v) => (v === u.id ? null : u.id));
                          if (editingUnitId === u.id) setEditingUnitId(null);
                        }}
                      >
                        {previewUnitId === u.id ? "Fechar prévia" : "▶ Pré-visualizar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: "5px 10px", minHeight: 30 }}
                        onClick={() => {
                          setEditingUnitId((v) => (v === u.id ? null : u.id));
                          if (previewUnitId === u.id) setPreviewUnitId(null);
                        }}
                      >
                        {editingUnitId === u.id ? "Fechar edição" : "Editar"}
                      </button>
                      <DeleteUnitButton unitId={u.id} courseId={courseId} unitName={u.name} />
                    </div>
                  </div>

                  {previewUnitId === u.id && <UnitPreview unit={u} />}

                  {editingUnitId === u.id && (
                    <div style={{ marginTop: 10 }}>
                      <UnitForm
                        courseId={courseId}
                        moduleId={module.id}
                        unitId={u.id}
                        initialName={u.name}
                        initialDescription={u.description ?? ""}
                        initialContentType={u.content_type === "TEXT" ? "TEXT" : "VIDEO"}
                        initialVideoUrl={u.video_url ?? ""}
                        initialTextContent={u.text_content ?? ""}
                        initialSortOrder={u.sort_order}
                        initialStatus={u.status}
                        onSuccess={() => setEditingUnitId(null)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!showEditModule &&
            (!showAddUnit ? (
            <button
              type="button"
              onClick={() => setShowAddUnit(true)}
              style={{
                fontSize: 14,
                padding: "10px 16px",
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              + Adicionar unidade (vídeo ou texto)
            </button>
          ) : (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px dashed var(--border, #e5e7eb)",
              }}
            >
              <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Nova unidade
              </p>
              <div
                style={{
                  padding: "clamp(14px, 3.5vw, 18px)",
                  background: "var(--bg)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border, #e5e7eb)",
                }}
              >
                <UnitForm
                  key={unitFormKey}
                  courseId={courseId}
                  moduleId={module.id}
                  initialSortOrder={units.length}
                  initialName=""
                  initialDescription=""
                  initialContentType="VIDEO"
                  initialVideoUrl=""
                  initialTextContent=""
                  onSuccess={() => setUnitFormKey((k) => k + 1)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAddUnit(false)}
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Cancelar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
