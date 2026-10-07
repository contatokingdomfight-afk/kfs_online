"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideCandidate } from "../../../actions";

export function DecisionForm({
  candidateId,
  eventId,
  canPass,
  hasScores,
  gradeName,
}: {
  candidateId: string;
  eventId: string;
  canPass: boolean;
  hasScores: boolean;
  gradeName: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const decide = (decision: "PASSED" | "FAILED" | "ABSENT") => {
    const text =
      decision === "PASSED"
        ? `Aprovar e atribuir o grau ${gradeName}? O aluno é notificado.`
        : decision === "FAILED"
          ? "Reprovar? O aluno é notificado e pode repetir daqui a 2 meses."
          : "Marcar falta? O aluno pode ser convocado para outro exame.";
    if (!window.confirm(text)) return;
    setError(null);
    start(async () => {
      const res = await decideCandidate(candidateId, decision, feedback);
      if (res.error) setError(res.error);
      else {
        router.push(`/coach/graduacao/${eventId}`);
        router.refresh();
      }
    });
  };

  return (
    <section className="card" style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700 }}>Decisão</h2>
      <div>
        <label htmlFor="feedback" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 6 }}>
          Feedback para o aluno <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <textarea
          id="feedback"
          className="input"
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="O que fez bem e no que se deve focar a seguir"
          style={{ resize: "vertical" }}
        />
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending || !canPass}
          onClick={() => decide("PASSED")}
          title={canPass ? undefined : "Só é possível aprovar quando a avaliação está completa e cumpre o critério"}
          style={{ background: canPass ? "var(--success)" : undefined }}
        >
          Aprovar — {gradeName}
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending || !hasScores} onClick={() => decide("FAILED")} style={{ color: "var(--danger)" }}>
          Reprovar
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => decide("ABSENT")}>
          Faltou
        </button>
      </div>
      {!canPass && (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          A aprovação só fica disponível quando todos os itens têm nota e o aluno cumpre o critério.
        </p>
      )}
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
