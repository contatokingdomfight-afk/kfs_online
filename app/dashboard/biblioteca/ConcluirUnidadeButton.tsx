"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeUnit } from "./actions";

type Props = { unitId: string; courseId: string };

export function ConcluirUnidadeButton({ unitId, courseId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const result = await completeUnit(unitId, courseId);
    setLoading(false);
    if (result.error) alert(result.error);
    else {
      setDone(true);
      router.refresh();
    }
  };

  if (done) {
    return (
      <span style={{ fontSize: 14, color: "var(--primary)", fontWeight: 500 }}>
        ✓ Concluído
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="btn btn-primary"
      style={{ fontSize: 14, padding: "6px 12px" }}
    >
      {loading ? "…" : "Marcar como concluído"}
    </button>
  );
}
