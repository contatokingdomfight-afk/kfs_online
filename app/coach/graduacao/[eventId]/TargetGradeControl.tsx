"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { setCandidateTargetGrade } from "../actions";

export type TargetGradeOption = { id: string; name: string; colors: string[] };

/** Admin: escolher o grau-alvo do exame (o próximo ou acima — salto de grau). */
export function TargetGradeControl({
  candidateId,
  studentName,
  currentTargetId,
  currentReason,
  options,
}: {
  candidateId: string;
  studentName: string;
  currentTargetId: string;
  currentReason: string | null;
  /** options[0] = próximo grau; os seguintes são saltos. */
  options: TargetGradeOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(currentTargetId);
  const [reason, setReason] = useState(currentReason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const skips = options.findIndex((o) => o.id === target);

  if (options.length < 2) return null;
  if (!open) {
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)} aria-label={`Grau-alvo de ${studentName}`}>
        Grau-alvo
      </button>
    );
  }

  const save = () => {
    setError(null);
    start(async () => {
      const r = await setCandidateTargetGrade(candidateId, target, reason);
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div style={{ flexBasis: "100%", marginTop: "var(--space-2)", borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
      <p style={{ margin: "0 0 8px", fontSize: "var(--text-sm)", fontWeight: 700 }}>Grau-alvo de {studentName}</p>
      <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((o, i) => {
          const on = o.id === target;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTarget(o.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
                background: on ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--bg)",
                color: "var(--text-primary)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <BeltSwatch colors={o.colors} width={28} height={10} />
              <span style={{ flex: 1 }}>{o.name}</span>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: i === 0 ? "var(--success)" : "var(--warning)" }}>
                {i === 0 ? "Próximo" : `Salta ${i}`}
              </span>
            </button>
          );
        })}
      </div>
      {skips > 0 && (
        <>
          <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            A folha de avaliação passa a ser a de {options[skips].name} (mais longa). Os requisitos de {options[skips].name} ficam dispensados e, se for
            aprovado, {skips === 1 ? `${options[0].name} fica registado` : `os graus intermédios ficam registados`} como «obtido por salto».
          </p>
          <label htmlFor={`skip-${candidateId}`} style={{ display: "block", margin: "8px 0 6px", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            Motivo do salto (obrigatório)
          </label>
          <textarea
            id={`skip-${candidateId}`}
            className="input"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ex.: Vem de outra academia com 3 anos de Muay Thai."
            style={{ resize: "vertical" }}
          />
        </>
      )}
      {error && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>
          {pending ? "A guardar…" : "Guardar grau-alvo"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
