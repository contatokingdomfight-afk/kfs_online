"use client";

import { useState } from "react";
import { deleteEvent } from "../actions";

type Props = { eventId: string; eventName: string };

export function DeleteEventoButton({ eventId, eventName }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok =
      typeof window !== "undefined" &&
      window.confirm(`Tem certeza que deseja apagar o evento "${eventName}"? As inscrições serão removidas.`);
    if (!ok) return;
    setError(null);
    setPending(true);
    try {
      await deleteEvent(eventId);
    } catch (e) {
      setError("Erro ao apagar evento.");
      setPending(false);
    }
  }

  return (
    <div style={{ marginTop: "clamp(20px, 5vw, 24px)" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="btn"
        style={{
          background: "var(--danger)",
          color: "#fff",
          border: "none",
          opacity: pending ? 0.7 : 1,
          minHeight: 44,
        }}
      >
        {pending ? "A apagar…" : "Apagar evento"}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}
