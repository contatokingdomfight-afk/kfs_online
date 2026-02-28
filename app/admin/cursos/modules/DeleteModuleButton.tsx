"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteModule } from "./actions";

type Props = { moduleId: string; courseId: string; moduleName: string };

export function DeleteModuleButton({ moduleId, courseId, moduleName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setLoading(true);
    const result = await deleteModule(moduleId, courseId);
    setLoading(false);
    if (result.error) alert(result.error);
    else {
      setConfirm(false);
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="btn"
      style={{
        fontSize: 12,
        padding: "4px 8px",
        background: confirm ? "var(--danger)" : "var(--surface)",
        color: confirm ? "white" : "var(--text-secondary)",
      }}
    >
      {loading ? "…" : confirm ? `Eliminar "${moduleName}"?` : "Eliminar"}
    </button>
  );
}
