"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import type { SchoolBankStatus } from "@/lib/revolut/bank-accounts";
import { disconnectSchoolBankAction, saveSchoolBankCert, type SchoolResult } from "../actions";

const hintStyle = { margin: 0, fontSize: "var(--text-xs)", lineHeight: 1.5, color: "var(--text-secondary)" };
const cardStyle = { padding: "var(--space-4)", display: "flex", flexDirection: "column" as const, gap: "var(--space-3)" };

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

function Header({ label, on }: { label: string; on: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>Confirmação de transferências</h2>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: on ? "var(--success)" : "var(--text-secondary)" }}>{label}</span>
    </div>
  );
}

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" });

export function SchoolBankPanel({ schoolId, status }: { schoolId: string; status: SchoolBankStatus }) {
  const [saveState, saveAction] = useActionState(saveSchoolBankCert, null as SchoolResult);
  const [disconnectState, disconnectAction] = useActionState(disconnectSchoolBankAction, null as SchoolResult);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    if (saveState?.success) setReplacing(false);
  }, [saveState]);

  const connected = Boolean(status.connectedAt);

  if (status.isSede) {
    return (
      <div className="card" style={cardStyle}>
        <Header label={connected ? "Ligada" : "Desligada"} on={connected} />
        <p style={hintStyle}>A Sede usa o certificado configurado no servidor e liga-se em Financeiro → Revolut.</p>
      </div>
    );
  }

  const certForm = (
    <form action={saveAction} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <input type="hidden" name="schoolId" value={schoolId} />
      <input name="clientId" required autoComplete="off" placeholder="ClientID" className="input" style={{ fontSize: "var(--text-sm)" }} />
      <textarea name="privateKey" required autoComplete="off" spellCheck={false} rows={4} placeholder="Chave privada (conteúdo de privatecert.pem)" className="input" style={{ fontSize: "var(--text-sm)", fontFamily: "monospace", WebkitTextSecurity: "disc" } as React.CSSProperties} />
      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", fontSize: "var(--text-sm)" }}>
        Guardar certificado
      </button>
      <FormLoadingModal message="A guardar o certificado…" />
    </form>
  );

  const disconnectForm = (
    <form
      action={disconnectAction}
      onSubmit={(e) => {
        if (!window.confirm("Desligar? As transferências já lidas ficam, mas deixam de entrar novas.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="schoolId" value={schoolId} />
      <button type="submit" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)", color: "var(--warning)" }}>
        Desligar
      </button>
    </form>
  );

  if (!status.certificateSaved || replacing) {
    return (
      <div className="card" style={cardStyle}>
        <Header label={connected ? "Ligada" : "Desligada"} on={connected} />
        <p style={hintStyle}>
          Marca como pagas as transferências recebidas na conta Revolut Business desta escola, só com acesso de leitura. Em Revolut Business → API → API empresarial, adiciona um certificado com este
          endereço de retorno e copia o ClientID:
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", fontSize: "var(--text-xs)", color: "var(--text-primary)", wordBreak: "break-all" }}>
          <code>{status.callbackUrl}</code>
          <CopyTextButton text={status.callbackUrl} />
        </div>
        {replacing && <p style={hintStyle}>Um certificado novo pede nova autorização na Revolut.</p>}
        {certForm}
        <Feedback state={saveState} />
        <Feedback state={disconnectState} />
      </div>
    );
  }

  return (
    <div className="card" style={cardStyle}>
      <Header label={connected ? "Ligada" : "Falta autorizar"} on={connected} />
      {!connected && <p style={hintStyle}>Certificado guardado. Autoriza o acesso só de leitura com a conta Revolut Business da escola.</p>}
      <div>
        <Detail label="ClientID">••••••{status.clientIdEnd}</Detail>
        {status.connectedAt && <Detail label="Ligada em">{fmt(status.connectedAt)}</Detail>}
        {status.lastSyncAt && <Detail label="Última leitura">{fmt(status.lastSyncAt)}</Detail>}
      </div>
      {status.lastSyncError && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--danger)" }}>Último erro: {status.lastSyncError}</p>}
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
        {connected ? (
          <Link href={`/admin/financeiro/banco?school=${encodeURIComponent(schoolId)}`} className="btn btn-secondary" style={{ fontSize: "var(--text-sm)", textDecoration: "none" }}>
            Ver transferências
          </Link>
        ) : (
          <a href={`/api/revolut/connect?school=${encodeURIComponent(schoolId)}`} className="btn btn-primary" style={{ fontSize: "var(--text-sm)", textDecoration: "none" }}>
            Autorizar na Revolut
          </a>
        )}
        <button type="button" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)" }} onClick={() => setReplacing(true)}>
          Trocar certificado
        </button>
        {disconnectForm}
      </div>
      <Feedback state={saveState} />
      <Feedback state={disconnectState} />
    </div>
  );
}
