"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { ConfirmModal } from "@/components/ConfirmModal";
import { decideCandidate, decidePlacement } from "../../../actions";
import { ConfirmSummary } from "./ConfirmSummary";

export type PlacementGradeOption = { id: string; name: string; colors: string[] };

/** Admin: escolher o grau atribuído no nivelamento (proposta = último grau cumprido). */
export function PlacementDecisionForm({
  candidateId,
  eventId,
  options,
  proposedId,
  hasScores,
  modalityCode,
}: {
  candidateId: string;
  eventId: string;
  /** Graus avaliados, do primeiro ao último. */
  options: PlacementGradeOption[];
  /** null = proposta sem grau novo. */
  proposedId: string | null;
  hasScores: boolean;
  modalityCode?: string;
}) {
  const router = useRouter();
  const NONE = "";
  const [award, setAward] = useState<string>(proposedId ?? NONE);
  const [feedback, setFeedback] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const differs = award !== (proposedId ?? NONE);
  const awardName = options.find((o) => o.id === award)?.name ?? null;
  const proposedPos = options.findIndex((o) => o.id === proposedId);

  const done = () => {
    router.push(`/coach/graduacao/${eventId}`);
    router.refresh();
  };

  const [ask, setAsk] = useState<null | "award" | "absent">(null);
  const awardOpt = options.find((o) => o.id === award) ?? null;

  const run = (fn: () => Promise<{ error?: string | null }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) {
        setAsk(null);
        setError(r.error);
      } else done();
    });
  };

  const confirm = () => run(() => decidePlacement(candidateId, award || null, feedback, note));
  const absent = () => run(() => decideCandidate(candidateId, "ABSENT", ""));

  const option = (id: string, label: React.ReactNode, tag: string | null, tagColor: string) => {
    const on = award === id;
    return (
      <button
        key={id || "none"}
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => setAward(id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          borderRadius: 10,
          border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
          background: on ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--bg)",
          color: "var(--text-primary)",
          fontSize: "var(--text-sm)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ flex: 1, display: "inline-flex", alignItems: "center", gap: 8 }}>{label}</span>
        {tag && <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: tagColor }}>{tag}</span>}
      </button>
    );
  };

  return (
    <section className="card" style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 700 }}>Grau a atribuir</h2>
      <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((o, i) =>
          option(
            o.id,
            <>
              <BeltSwatch colors={o.colors} width={28} height={10} modality={modalityCode} /> {o.name}
            </>,
            o.id === proposedId ? "Proposta" : proposedPos >= 0 ? (i > proposedPos ? "Acima da proposta" : null) : "Acima da proposta",
            o.id === proposedId ? "var(--success)" : "var(--warning)"
          )
        )}
        {option(NONE, "Sem grau novo", proposedId === null ? "Proposta" : null, "var(--success)")}
      </div>
      {differs && (
        <div>
          <label htmlFor="placement-note" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 6 }}>
            Motivo (diferente da proposta — obrigatório)
          </label>
          <textarea
            id="placement-note"
            className="input"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>
      )}
      <div>
        <label htmlFor="placement-feedback" style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 6 }}>
          Feedback para o aluno <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <textarea
          id="placement-feedback"
          className="input"
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="O que fez bem e no que se deve focar a seguir"
          style={{ resize: "vertical" }}
        />
      </div>
      <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {awardName
          ? `Fica com ${awardName}${options.findIndex((o) => o.id === award) > 0 ? "; os graus abaixo ficam registados como «obtido por nivelamento»" : ""}. Os requisitos do próximo grau contam a partir de hoje.`
          : "Fica sem grau novo. Não conta como reprovação (sem intervalo de 2 meses)."}
      </p>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" disabled={pending || !hasScores || (differs && !note.trim())} onClick={() => setAsk("award")}>
          {pending ? "A gravar…" : "Confirmar resultado"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setAsk("absent")}>
          Faltou
        </button>
      </div>
      <ConfirmModal
        open={ask === "award"}
        onClose={() => !pending && setAsk(null)}
        onConfirm={confirm}
        loading={pending}
        variant={awardOpt ? "success" : "primary"}
        title={awardOpt ? "Atribuir grau" : "Terminar sem grau novo"}
        confirmLabel={awardOpt ? `Atribuir ${awardOpt.name}` : "Confirmar"}
        cancelLabel="Voltar"
      >
        <ConfirmSummary
          belt={awardOpt ? <BeltSwatch colors={awardOpt.colors} width={44} height={14} modality={modalityCode} /> : null}
          headline={awardOpt ? awardOpt.name : "Sem grau novo"}
          lines={[
            awardOpt ? "Os requisitos do próximo grau contam a partir de hoje." : "Não conta como reprovação.",
            differs ? "Diferente da proposta — o motivo fica registado." : null,
            feedback.trim() ? "O feedback é enviado ao aluno." : "Sem feedback para o aluno.",
            "O aluno recebe uma notificação.",
          ]}
        />
      </ConfirmModal>
      <ConfirmModal
        open={ask === "absent"}
        onClose={() => !pending && setAsk(null)}
        onConfirm={absent}
        loading={pending}
        variant="primary"
        title="Marcar falta"
        message="O aluno fica como ausente neste exame e pode ser convocado para outro."
        confirmLabel="Marcar falta"
        cancelLabel="Voltar"
      />
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
