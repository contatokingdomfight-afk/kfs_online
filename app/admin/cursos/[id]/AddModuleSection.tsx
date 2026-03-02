"use client";

import { useState } from "react";
import { ModuleForm } from "../modules/ModuleForm";

type Props = {
  courseId: string;
  initialSortOrder: number;
  hasModules: boolean;
};

export function AddModuleSection({ courseId, initialSortOrder, hasModules }: Props) {
  const [open, setOpen] = useState(!hasModules);

  return (
    <div
      style={{
        marginBottom: "clamp(20px, 5vw, 24px)",
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            padding: "clamp(14px, 3.5vw, 18px)",
            background: "var(--surface)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: "clamp(15px, 3.8vw, 17px)",
            fontWeight: 600,
            color: "var(--primary)",
          }}
        >
          + Adicionar módulo
        </button>
      ) : (
        <div style={{ padding: "clamp(16px, 4vw, 20px)", borderTop: hasModules ? "1px solid var(--border, #e5e7eb)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Novo módulo</span>
            {hasModules && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  fontSize: 13,
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Fechar
              </button>
            )}
          </div>
          <ModuleForm courseId={courseId} initialSortOrder={initialSortOrder} />
        </div>
      )}
    </div>
  );
}
