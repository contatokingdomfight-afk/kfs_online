"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createArbitrationCriteriaSet,
  deleteArbitrationCriteriaSet,
} from "@/app/coach/arbitragem/actions";
import { MAX_CRITERIA_COUNT, MIN_CRITERIA_COUNT } from "@/lib/arbitration/criteria-sets";
import type { ArbitrationCriteriaSetRow } from "@/lib/arbitration/types";

type Props = {
  sets: ArbitrationCriteriaSetRow[];
};

export function CriteriaSetsPanel({ sets }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [labels, setLabels] = useState<string[]>(["", "", ""]);

  const addRow = () => {
    if (labels.length >= MAX_CRITERIA_COUNT) return;
    setLabels((prev) => [...prev, ""]);
  };

  const removeRow = (index: number) => {
    if (labels.length <= MIN_CRITERIA_COUNT) return;
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const createSet = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await createArbitrationCriteriaSet({ name, labels });
        setMessage("Perfil criado.");
        setName("");
        setLabels(["", "", ""]);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      }
    });
  };

  const removeSet = (id: string) => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await deleteArbitrationCriteriaSet(id);
        setMessage("Perfil apagado.");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      }
    });
  };

  return (
    <section className="arb-card">
      <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>Perfis de critérios</h2>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary)" }}>
        O perfil Kingdom (padrão) tem os 6 critérios actuais. Crie outros perfis e escolha um ao criar cada evento — fica
        fixo para todos os combates desse evento.
      </p>

      {message ? <p style={{ color: "var(--success)", fontSize: 14 }}>{message}</p> : null}
      {error ? <p style={{ color: "var(--danger)", fontSize: 14 }}>{error}</p> : null}

      <ul style={{ margin: "0 0 16px", paddingLeft: 18, fontSize: 14 }}>
        {sets.map((set) => (
          <li key={set.id} style={{ marginBottom: 6 }}>
            <strong>{set.name}</strong>
            <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>
              ({set.criteria.length} critérios)
            </span>
            {!set.isBuiltin ? (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginLeft: 8, fontSize: 12, padding: "2px 8px" }}
                disabled={pending}
                onClick={() => removeSet(set.id)}
              >
                Apagar
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Novo perfil</div>
        <input className="input" placeholder="Nome do perfil (ex.: Kickboxing 4 critérios)" value={name} onChange={(e) => setName(e.target.value)} />
        {labels.map((label, index) => (
          <div key={index} style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder={`Critério ${index + 1}`}
              value={label}
              onChange={(e) =>
                setLabels((prev) => prev.map((l, i) => (i === index ? e.target.value : l)))
              }
            />
            {labels.length > MIN_CRITERIA_COUNT ? (
              <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => removeRow(index)}>
                −
              </button>
            ) : null}
          </div>
        ))}
        {labels.length < MAX_CRITERIA_COUNT ? (
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={addRow}>
            + Critério
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending || !name.trim() || labels.filter((l) => l.trim()).length < MIN_CRITERIA_COUNT}
          onClick={createSet}
        >
          Criar perfil
        </button>
      </div>
    </section>
  );
}
