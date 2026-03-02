"use client";

import { useState } from "react";
import { DeleteModuleButton } from "../modules/DeleteModuleButton";
import { DeleteUnitButton } from "../modules/units/DeleteUnitButton";
import { UnitForm } from "../modules/units/UnitForm";

type Unit = {
  id: string;
  module_id: string;
  name: string;
  content_type: string;
  sort_order: number;
};

type Module = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type Props = {
  courseId: string;
  module: Module;
  index: number;
  units: Unit[];
};

export function ModuleCard({ courseId, module, index, units }: Props) {
  const [open, setOpen] = useState(true);
  const [showAddUnit, setShowAddUnit] = useState(false);

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, color: "var(--text-secondary)" }}>{open ? "▼" : "▶"}</span>
          <span style={{ fontWeight: 600, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)" }}>
            Módulo {index + 1}: {module.name}
          </span>
          {units.length > 0 && (
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              ({units.length} {units.length === 1 ? "unidade" : "unidades"})
            </span>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DeleteModuleButton moduleId={module.id} courseId={courseId} moduleName={module.name} />
        </div>
      </div>

      {open && (
        <div style={{ padding: "clamp(12px, 3vw, 16px)", borderTop: "1px solid var(--border, #e5e7eb)" }}>
          {module.description && (
            <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-secondary)" }}>{module.description}</p>
          )}

          {units.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
              {units.map((u, uIdx) => (
                <li
                  key={u.id}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 500, fontSize: 14, color: "var(--text-primary)" }}>
                    {uIdx + 1}. {u.name}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", marginRight: "auto", marginLeft: 8 }}>
                    {u.content_type === "VIDEO" ? "Vídeo" : "Texto"}
                  </span>
                  <DeleteUnitButton unitId={u.id} courseId={courseId} unitName={u.name} />
                </li>
              ))}
            </ul>
          )}

          {!showAddUnit ? (
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
                  courseId={courseId}
                  moduleId={module.id}
                  initialSortOrder={units.length}
                  initialName=""
                  initialDescription=""
                  initialContentType="VIDEO"
                  initialVideoUrl=""
                  initialTextContent=""
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
          )}
        </div>
      )}
    </div>
  );
}
