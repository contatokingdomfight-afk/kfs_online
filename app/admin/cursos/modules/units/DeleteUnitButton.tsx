"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUnit } from "./actions";

type Props = { unitId: string; courseId: string; unitName: string };

export function DeleteUnitButton({ unitId, courseId, unitName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirm(`Eliminar a unidade "${unitName}"?`)) return;
    setLoading(true);
    const result = await deleteUnit(unitId, courseId);
    setLoading(false);
    if (result.error) alert(result.error);
    else router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="btn"
      style={{
        fontSize: 12,
        padding: "4px 8px",
        backgroundColor: "var(--danger)",
        color: "#fff",
        border: "none",
      }}
    >
      {loading ? "…" : "Eliminar"}
    </button>
  );
}
