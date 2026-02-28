"use client";

import { useFormState } from "react-dom";
import { deleteDimension, type DimensionResult } from "./actions";
import { useEffect, useState } from "react";

export function DeleteDimensionButton({ dimensionId, dimensionName }: { dimensionId: string; dimensionName: string }) {
  const [state, formAction] = useFormState(deleteDimension, null as DimensionResult | null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state?.success || state?.error) setConfirming(false);
  }, [state]);

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Eliminar &quot;{dimensionName}&quot;?</span>
        <form action={formAction} style={{ display: "flex", gap: 6 }}>
          <input type="hidden" name="dimensionId" value={dimensionId} />
          <button type="submit" className="btn" style={{ padding: "4px 10px", fontSize: 13, backgroundColor: "var(--danger)", color: "#fff" }}>
            Sim
          </button>
          <button type="button" className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 13 }} onClick={() => setConfirming(false)}>
            Não
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "4px 10px", fontSize: 13 }}
        onClick={() => setConfirming(true)}
      >
        Eliminar
      </button>
      {state?.error && state.success === undefined && (
        <span style={{ fontSize: 12, color: "var(--danger)" }}>{state.error}</span>
      )}
    </>
  );
}
