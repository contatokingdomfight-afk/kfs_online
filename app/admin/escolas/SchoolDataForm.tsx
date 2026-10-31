"use client";

import { useActionState } from "react";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import { createSchool, updateSchool, type SchoolResult } from "./actions";

type SchoolData = { id: string; name: string; city: string | null; address: string | null; phone: string | null; email: string | null };

type SchoolLegalData = { legalName: string | null; legalAddress: string | null; nif: string | null };

/** Sem `school` cria uma escola nova (fica em preparação); com `school` atualiza os dados. `legal` não se passa na Sede: o contrato dela é fixo. */
export function SchoolDataForm({ school, legal }: { school?: SchoolData; legal?: SchoolLegalData }) {
  const [state, action] = useActionState(school ? updateSchool : createSchool, null as SchoolResult);
  const inputStyle = { fontSize: "var(--text-sm)" };

  return (
    <form action={action} className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {school && <input type="hidden" name="schoolId" value={school.id} />}
      <input name="name" defaultValue={school?.name} placeholder="Nome da escola *" required className="input" style={inputStyle} />
      <input name="city" defaultValue={school?.city ?? ""} placeholder="Cidade" className="input" style={inputStyle} />
      <input name="address" defaultValue={school?.address ?? ""} placeholder="Morada completa" className="input" style={inputStyle} />
      <input name="phone" defaultValue={school?.phone ?? ""} placeholder="Telefone" className="input" style={inputStyle} />
      <input name="email" defaultValue={school?.email ?? ""} placeholder="Email da escola" type="email" className="input" style={inputStyle} />
      {legal && (
        <>
          <div style={{ marginTop: "var(--space-2)" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>Dados legais</h2>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", lineHeight: 1.5, color: "var(--text-secondary)" }}>
              Identificam a escola no contrato de adesão. Sem eles os alunos não conseguem assinar e a escola não abre. Os contratos já assinados não mudam.
            </p>
          </div>
          <input name="legalName" defaultValue={legal.legalName ?? ""} placeholder="Denominação social (ex.: Empresa, Lda)" className="input" style={inputStyle} />
          <input name="nif" defaultValue={legal.nif ?? ""} placeholder="NIPC" inputMode="numeric" className="input" style={inputStyle} />
          <input name="legalAddress" defaultValue={legal.legalAddress ?? ""} placeholder="Sede (morada legal)" className="input" style={inputStyle} />
        </>
      )}
      <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", fontSize: "var(--text-sm)" }}>
        {school ? "Guardar" : "Criar escola"}
      </button>
      {state?.error && <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{state.error}</p>}
      {state?.success && <p style={{ color: "var(--success)", fontSize: "var(--text-sm)", margin: 0 }}>{state.success}</p>}
      <FormLoadingModal message={school ? "A guardar alterações da escola…" : "A criar escola…"} />
    </form>
  );
}
