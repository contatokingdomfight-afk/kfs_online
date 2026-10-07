"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { removeCandidate, setExamEventStatus } from "../actions";

export function EventActions({ eventId, status, pendingCount }: { eventId: string; status: string; pendingCount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (next: "COMPLETED" | "CANCELLED" | "SCHEDULED", confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const res = await setExamEventStatus(eventId, next);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <section style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {status === "SCHEDULED" ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pending || pendingCount > 0}
              title={pendingCount > 0 ? "Decide o resultado de todos os convocados primeiro" : undefined}
              onClick={() => run("COMPLETED", "Concluir o exame? Deixa de ser possível convocar ou avaliar.")}
            >
              Concluir exame
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ color: "var(--danger)" }}
              disabled={pending}
              onClick={() => run("CANCELLED", "Cancelar este exame? Os alunos convocados deixam de o ver.")}
            >
              Cancelar exame
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => run("SCHEDULED", "Reabrir este exame?")}>
            Reabrir exame
          </button>
        )}
      </div>
      {status === "SCHEDULED" && pendingCount > 0 && (
        <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          Para concluir, decide o resultado dos {pendingCount} {pendingCount === 1 ? "aluno" : "alunos"} por avaliar (ou marca falta).
        </p>
      )}
      {error && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </section>
  );
}

export function RemoveCandidateButton({ candidateId, name }: { candidateId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Remover ${name} do exame`}
      title="Remover convocatória"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Remover ${name} deste exame?`)) return;
        start(async () => {
          const res = await removeCandidate(candidateId);
          if (res.error) window.alert(res.error);
          else router.refresh();
        });
      }}
      style={{
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        color: "var(--text-secondary)",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <X size={16} />
    </button>
  );
}
