"use client";

import { useActionState, useEffect, useState } from "react";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import type { SchoolMerchantStatus } from "@/lib/revolut/merchant-accounts";
import { connectSchoolRevolut, disconnectSchoolRevolut, type SchoolResult } from "../actions";

const hintStyle = { margin: 0, fontSize: "var(--text-xs)", lineHeight: 1.5, color: "var(--text-secondary)" };

function Feedback({ state }: { state: SchoolResult }) {
  if (state?.error) return <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{state.error}</p>;
  if (state?.success) return <p style={{ color: "var(--success)", fontSize: "var(--text-sm)", margin: 0 }}>{state.success}</p>;
  return null;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: "var(--text-sm)" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{children}</span>
    </div>
  );
}

function Header({ on }: { on: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>Pagamento online (Revolut)</h2>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: on ? "var(--success)" : "var(--text-secondary)" }}>{on ? "Ligado" : "Desligado"}</span>
    </div>
  );
}

export function SchoolRevolutPanel({ schoolId, status }: { schoolId: string; status: SchoolMerchantStatus }) {
  const [connectState, connectAction] = useActionState(connectSchoolRevolut, null as SchoolResult);
  const [disconnectState, disconnectAction] = useActionState(disconnectSchoolRevolut, null as SchoolResult);
  const [replacing, setReplacing] = useState(false);
  const cardStyle = { padding: "var(--space-4)", display: "flex", flexDirection: "column" as const, gap: "var(--space-3)" };

  useEffect(() => {
    if (connectState?.success) setReplacing(false);
  }, [connectState]);

  if (status.isSede) {
    return (
      <div className="card" style={cardStyle}>
        <Header on={status.connected} />
        <p style={hintStyle}>A Sede usa a conta configurada no servidor. Não há nada a alterar aqui.</p>
      </div>
    );
  }

  const connectForm = (
    <form action={connectAction} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <input type="hidden" name="schoolId" value={schoolId} />
      <input name="secretKey" type="password" required autoComplete="off" placeholder="Chave secreta da Revolut" className="input" style={{ fontSize: "var(--text-sm)" }} />
      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", fontSize: "var(--text-sm)" }}>
        {status.connected ? "Guardar nova chave" : "Ligar conta"}
      </button>
      <Feedback state={connectState} />
      <FormLoadingModal message="A ligar à Revolut…" />
    </form>
  );

  if (!status.connected) {
    return (
      <div className="card" style={cardStyle}>
        <Header on={false} />
        <p style={hintStyle}>
          Cartão, Revolut Pay e pagamento automático, com o dinheiro a entrar na conta Revolut desta escola. Em Revolut Business → API → Comerciante, copia a chave secreta (começa por «sk_»).
        </p>
        {connectForm}
        <Feedback state={disconnectState} />
      </div>
    );
  }

  const hasAutoPay = status.activeAutoPay > 0;
  return (
    <div className="card" style={cardStyle}>
      <Header on />
      <p style={hintStyle}>Os alunos desta escola já podem pagar online. O dinheiro entra na conta Revolut da escola.</p>
      <div>
        <Detail label="Chave">••••••{status.last4}</Detail>
        <Detail label="Avisos de pagamento">Ativos</Detail>
        {status.connectedAt && <Detail label="Ligada em">{new Date(status.connectedAt).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}</Detail>}
        {hasAutoPay && <Detail label="Pagamentos automáticos ativos">{status.activeAutoPay}</Detail>}
      </div>
      {replacing ? (
        <>
          {hasAutoPay && <p style={hintStyle}>Usa uma chave da mesma conta Revolut: uma conta diferente não conhece as subscrições desta escola.</p>}
          {connectForm}
        </>
      ) : (
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={() => setReplacing(true)}>
            Trocar chave
          </button>
          <form
            action={disconnectAction}
            onSubmit={(e) => {
              if (!window.confirm("Desligar o pagamento online desta escola? Os links de pagamento já enviados deixam de ficar registados como pagos.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="schoolId" value={schoolId} />
            <button type="submit" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)", color: "var(--warning)" }} disabled={hasAutoPay}>
              Desligar
            </button>
          </form>
        </div>
      )}
      {hasAutoPay && !replacing && <p style={hintStyle}>Para desligar, cancela primeiro os {status.activeAutoPay} pagamentos automáticos.</p>}
      {!replacing && <Feedback state={connectState} />}
      <Feedback state={disconnectState} />
    </div>
  );
}
