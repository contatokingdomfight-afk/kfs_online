"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { setCandidatePlacement, setCandidateTargetGrade } from "../actions";

const PLACEMENT = "__placement__";

export type TargetGradeOption = { id: string; name: string; colors: string[] };

/** Admin: escolher o grau-alvo do exame (o próximo ou acima — salto de grau). */
export function TargetGradeControl({
  candidateId,
  studentName,
  currentTargetId,
  currentReason,
  options,
  placement,
}: {
  candidateId: string;
  studentName: string;
  currentTargetId: string;
  currentReason: string | null;
  /** options[0] = próximo grau; os seguintes são saltos. */
  options: TargetGradeOption[];
  /** Nivelamento já definido (null = exame normal). */
  placement: { maxGradeId: string | null; note: string | null } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(placement ? PLACEMENT : currentTargetId);
  const [reason, setReason] = useState(currentReason ?? "");
  const [maxGrade, setMaxGrade] = useState(placement?.maxGradeId ?? "");
  const [note, setNote] = useState(placement?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const skips = options.findIndex((o) => o.id === target);

  if (options.length === 0) return null;
  if (!open) {
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)} aria-label={`Tipo de exame de ${studentName}`}>
        Tipo de exame
      </button>
    );
  }

  const save = () => {
    setError(null);
    start(async () => {
      const r =
        target === PLACEMENT ? await setCandidatePlacement(candidateId, maxGrade || null, note) : await setCandidateTargetGrade(candidateId, target, reason);
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
      <p style={{ margin: "0 0 8px", fontSize: "var(--text-sm)", fontWeight: 700 }}>O que vai ser avaliado — {studentName}</p>
      <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          role="radio"
          aria-checked={target === PLACEMENT}
          onClick={() => setTarget(PLACEMENT)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 10,
            border: `1px solid ${target === PLACEMENT ? "var(--primary)" : "var(--border)"}`,
            background: target === PLACEMENT ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--bg)",
            color: "var(--text-primary)",
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span aria-hidden style={{ width: 28, textAlign: "center" }}>🧭</span>
          <span style={{ flex: 1, fontWeight: 600 }}>Nivelamento</span>
          <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--primary)" }}>Descobrir o grau</span>
        </button>
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
      {target === PLACEMENT && (
        <>
          <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            O avaliador começa em {options[0].name} e avança grau a grau enquanto o aluno cumprir o critério. No fim, o admin escolhe o grau a
            atribuir. Os requisitos (presenças, tempo, cursos) não se aplicam.
          </p>
          <label htmlFor={`max-${candidateId}`} style={{ display: "block", margin: "8px 0 6px", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            Até que grau avaliar, no máximo <span style={{ fontWeight: 400 }}>(opcional)</span>
          </label>
          <select id={`max-${candidateId}`} className="input" value={maxGrade} onChange={(e) => setMaxGrade(e.target.value)}>
            <option value="">Sem limite</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <label htmlFor={`note-${candidateId}`} style={{ display: "block", margin: "8px 0 6px", fontSize: "var(--text-xs)", fontWeight: 600 }}>
            Historial do aluno <span style={{ fontWeight: 400 }}>(fica no registo)</span>
          </label>
          <textarea
            id={`note-${candidateId}`}
            className="input"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex.: 3 anos de Muay Thai na Academia X."
            style={{ resize: "vertical" }}
          />
        </>
      )}
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
          {pending ? "A guardar…" : "Guardar"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
