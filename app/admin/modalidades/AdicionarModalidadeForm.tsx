"use client";

import { useFormState } from "react-dom";
import { createModality, type ModalityResult } from "./actions";

export function AdicionarModalidadeForm() {
  const [state, formAction] = useFormState(createModality, null as ModalityResult | null);

  return (
    <form
      action={formAction}
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        marginTop: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(12px, 3vw, 16px)",
      }}
    >
      <h2 style={{ margin: "0 0 4px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Adicionar nova modalidade
      </h2>
      <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
        Código em maiúsculas (ex: BJJ, JIU_JITSU). O nome é o que aparece na plataforma.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(12px, 3vw, 16px)" }}>
        <label style={{ flex: "1 1 140px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 500, color: "var(--text-primary)" }}>
            Código *
          </span>
          <input
            type="text"
            name="code"
            required
            placeholder="ex: BJJ"
            className="input"
            style={{ textTransform: "uppercase" }}
          />
        </label>
        <label style={{ flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 500, color: "var(--text-primary)" }}>
            Nome *
          </span>
          <input
            type="text"
            name="name"
            required
            placeholder="ex: Jiu-Jitsu"
            className="input"
          />
        </label>
      </div>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      {state?.success && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--success)" }}>
          Modalidade adicionada.
        </p>
      )}
      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
        Adicionar modalidade
      </button>
    </form>
  );
}
