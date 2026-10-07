"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createExamEvent } from "../actions";

const label: React.CSSProperties = { display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 6 };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "100%" }}>
      {pending ? "A criar…" : "Criar exame"}
    </button>
  );
}

export function NewExamForm({ modalities }: { modalities: { code: string; name: string; isPublished: boolean }[] }) {
  const [state, action] = useActionState(createExamEvent, null);
  const defaultModality = modalities.find((m) => m.isPublished)?.code ?? modalities[0]?.code;

  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <label style={label} htmlFor="modalityCode">
          Modalidade
        </label>
        <select id="modalityCode" name="modalityCode" className="input" defaultValue={defaultModality} required>
          {modalities.map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
              {m.isPublished ? "" : " (graduação em rascunho)"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={label} htmlFor="title">
          Nome do exame <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <input id="title" name="title" className="input" placeholder="ex.: Exame de graduação — Outubro" maxLength={120} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }}>
        <div>
          <label style={label} htmlFor="date">
            Data
          </label>
          <input id="date" name="date" type="date" className="input" required />
        </div>
        <div>
          <label style={label} htmlFor="time">
            Hora
          </label>
          <input id="time" name="time" type="time" className="input" defaultValue="10:00" required />
        </div>
      </div>
      <div>
        <label style={label} htmlFor="location">
          Local <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <input id="location" name="location" className="input" placeholder="ex.: Sede — tatame principal" maxLength={160} />
      </div>
      <div>
        <label style={label} htmlFor="notes">
          Notas para os alunos <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <textarea id="notes" name="notes" className="input" rows={3} placeholder="ex.: Trazer luvas, caneleiras e protetor bucal." style={{ resize: "vertical" }} />
      </div>
      {state?.error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}
