"use client";

import { useState } from "react";
import { deleteMission } from "./actions";
export function DeleteMissionButton({
  missionId,
  missionName,
}: {
  missionId: string;
  missionName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await deleteMission(missionId);
    setLoading(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Eliminar &quot;{missionName}&quot;?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="btn text-sm bg-red-600 hover:bg-red-700 text-white"
        >
          {loading ? "…" : "Sim"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary text-sm">
          Não
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm text-text-secondary hover:text-red-500"
      aria-label={`Eliminar missão ${missionName}`}
    >
      Eliminar
    </button>
  );
}
