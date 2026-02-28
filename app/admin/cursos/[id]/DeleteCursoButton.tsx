"use client";

import { useState } from "react";
import { deleteCourse } from "../actions";

type Props = { courseId: string; courseName: string };

export function DeleteCursoButton({ courseId, courseName }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok =
      typeof window !== "undefined" &&
      window.confirm(`Tem certeza que deseja apagar o curso "${courseName}"? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    setError(null);
    setPending(true);
    try {
      const result = await deleteCourse(courseId);
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch {
      setError("Erro ao apagar curso.");
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
        {pending ? "A apagar…" : "Apagar curso"}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
