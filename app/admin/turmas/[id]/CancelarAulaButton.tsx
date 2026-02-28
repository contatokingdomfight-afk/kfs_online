"use client";

import { useState } from "react";
import { deleteLesson } from "../actions";

type Props = { lessonId: string };

export function CancelarAulaButton({ lessonId }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok = typeof window !== "undefined" && window.confirm("Tem certeza que deseja cancelar esta aula? Esta ação não pode ser desfeita.");
    if (!ok) return;
    setError(null);
    setPending(true);
    try {
      const result = await deleteLesson(lessonId);
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
      // Se sucesso, deleteLesson faz redirect para /admin/turmas
    } catch {
      setError("Erro ao cancelar aula.");
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
        }}
      >
        {pending ? "A cancelar…" : "Cancelar aula"}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
