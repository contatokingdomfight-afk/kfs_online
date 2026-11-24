"use client";

import { useActionState } from "react";
import { saveCoachPrivateData, type CoachAdesaoResult } from "./actions";

export type CoachDataDefaults = {
  legalName: string;
  nif: string;
  idDocumentNumber: string;
  address: string;
  iban: string;
  tptdNumber: string;
  tptdValidUntil: string;
  selfEmployed: boolean;
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--text-secondary)" };

export function CoachDataForm({ defaults }: { defaults: CoachDataDefaults }) {
  const [state, formAction, pending] = useActionState<CoachAdesaoResult | null, FormData>(saveCoachPrivateData, null);
  return (
    <form action={formAction} className="card" style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>1 · Os teus dados</h2>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
        Servem para o contrato e para receberes os pagamentos. Só a administração da escola os vê.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <label style={labelStyle}>
          Nome completo
          <input name="legalName" className="input" required defaultValue={defaults.legalName} autoComplete="name" />
        </label>
        <label style={labelStyle}>
          NIF
          <input name="nif" className="input" required inputMode="numeric" maxLength={11} defaultValue={defaults.nif} />
        </label>
        <label style={labelStyle}>
          N.º do Cartão de Cidadão (opcional)
          <input name="idDocumentNumber" className="input" defaultValue={defaults.idDocumentNumber} />
        </label>
        <label style={labelStyle}>
          Morada
          <input name="address" className="input" required defaultValue={defaults.address} autoComplete="street-address" />
        </label>
        <label style={labelStyle}>
          IBAN (para receberes)
          <input name="iban" className="input" required defaultValue={defaults.iban} placeholder="PT50 …" />
        </label>
        <label style={labelStyle}>
          N.º do TPTD (título de treinador)
          <input name="tptdNumber" className="input" required defaultValue={defaults.tptdNumber} />
        </label>
        <label style={labelStyle}>
          Validade do TPTD
          <input name="tptdValidUntil" type="date" className="input" defaultValue={defaults.tptdValidUntil} />
        </label>
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" name="selfEmployed" defaultChecked={defaults.selfEmployed} style={{ marginTop: 3 }} />
        <span>Tenho atividade aberta nas Finanças e passo recibos verdes.</span>
      </label>
      {state?.error && (
        <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "A guardar…" : "Guardar e continuar"}
      </button>
    </form>
  );
}
