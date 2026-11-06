"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { decideCandidate } from "../../../actions";
import { ConfirmSummary } from "./ConfirmSummary";

/** Mínimo de caracteres da justificação para aprovar sem cumprir o critério. */
const OVERRIDE_MIN = 10;

export function DecisionForm({
  candidateId,
  eventId,
  canPass,
  isComplete,
  hasScores,
  gradeName,
}: {
  candidateId: string;
  eventId: string;
  canPass: boolean;
  /** Todos os itens têm nota (permite aprovar contra o critério, com justificação). */
  isComplete: boolean;
  hasScores: boolean;
  gradeName: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [override, setOverride] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const canOverride = !canPass && isComplete;

  const [ask, setAsk] = useState<null | { decision: "PASSED" | "FAILED" | "ABSENT"; withOverride: boolean }>(null);

  const decide = (decision: "PASSED" | "FAILED" | "ABSENT", withOverride = false) => setAsk({ decision, withOverride });

  const run = () => {
    if (!ask) return;
    const { decision, withOverride } = ask;
    setError(null);
    start(async () => {
      const res = await decideCandidate(candidateId, decision, feedback, withOverride ? override : undefined);
      if (res.error) {
        setAsk(null);
        setError(res.error);
      } else {
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
        {canPass ? (
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => decide("PASSED")} style={{ background: "var(--success)" }}>
            Aprovar — {gradeName}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pending || !canOverride}
            onClick={() => setOverrideOpen((o) => !o)}
            aria-expanded={overrideOpen}
            title={canOverride ? undefined : "Completa a avaliação (todos os itens com nota) para poder aprovar"}
          >
            Aprovar mesmo assim…
          </button>
        )}
        <button type="button" className="btn btn-secondary" disabled={pending || !hasScores} onClick={() => decide("FAILED")} style={{ color: "var(--danger)" }}>
          Reprovar
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => decide("ABSENT")}>
          Faltou
        </button>
      </div>

      {canOverride && overrideOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "var(--space-3)",
            borderRadius: 12,
            border: "1px solid color-mix(in srgb, var(--warning) 40%, transparent)",
            background: "color-mix(in srgb, var(--warning) 7%, transparent)",
          }}
        >
          <label htmlFor="override" style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>
            Justificação para aprovar sem cumprir o critério
          </label>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            Fica registada com o teu nome e só a veem coaches e admins — o aluno vê apenas «Aprovado».
          </p>
          <textarea
            id="override"
            className="input"
            rows={3}
            maxLength={1000}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder="ex.: Tático abaixo do mínimo por nervosismo; nos treinos demonstra o nível do grau de forma consistente."
            style={{ resize: "vertical" }}
          />
          <div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending || override.trim().length < OVERRIDE_MIN}
              onClick={() => decide("PASSED", true)}
              style={{ background: "var(--success)" }}
            >
              Aprovar com justificação — {gradeName}
            </button>
          </div>
        </div>
      )}

      {!canPass && (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          {isComplete
            ? "O aluno não cumpre o critério do sistema. Podes reprovar ou, com uma justificação, aprovar mesmo assim."
            : "Completa a avaliação (todos os itens com nota) para poder decidir a aprovação."}
        </p>
      )}
      <ConfirmModal
        open={ask !== null}
        onClose={() => !pending && setAsk(null)}
        onConfirm={run}
        loading={pending}
        variant={ask?.decision === "PASSED" ? "success" : ask?.decision === "FAILED" ? "danger" : "primary"}
        title={ask?.decision === "PASSED" ? "Aprovar aluno" : ask?.decision === "FAILED" ? "Reprovar aluno" : "Marcar falta"}
        confirmLabel={ask?.decision === "PASSED" ? `Aprovar — ${gradeName}` : ask?.decision === "FAILED" ? "Reprovar" : "Marcar falta"}
        cancelLabel="Voltar"
      >
        {ask?.decision === "ABSENT" ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            O aluno fica como ausente neste exame e pode ser convocado para outro.
          </p>
        ) : ask ? (
          <ConfirmSummary
            headline={ask.decision === "PASSED" ? gradeName : `Não aprovado — ${gradeName}`}
            tone={ask.decision === "PASSED" ? "success" : "danger"}
            lines={[
              ask.decision === "PASSED"
                ? "O grau é atribuído e os requisitos do próximo contam a partir de hoje."
                : "Pode repetir o exame daqui a 2 meses.",
              ask.withOverride && "Aprovado sem cumprir o critério — a justificação fica registada.",
              feedback.trim() ? "O feedback é enviado ao aluno." : "Sem feedback para o aluno.",
              "O aluno recebe uma notificação.",
            ]}
          />
        ) : null}
      </ConfirmModal>
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
