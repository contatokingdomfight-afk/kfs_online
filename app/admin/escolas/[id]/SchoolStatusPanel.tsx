"use client";

import { useActionState } from "react";
import { FormLoadingModal } from "@/components/FormLoadingModal";
import type { SchoolMerchantStatus } from "@/lib/revolut/merchant-accounts";
import { hasPaymentMethod, type SchoolPaymentMethods, type SchoolStatus } from "@/lib/school-status";
import { deactivateSchool, openSchool, saveSchoolPaymentMethods, type SchoolResult } from "../actions";
import type { SchoolBankStatus } from "@/lib/revolut/bank-accounts";
import { SchoolBankPanel } from "./SchoolBankPanel";
import { SchoolRevolutPanel } from "./SchoolRevolutPanel";

export type PaymentFormValues = SchoolPaymentMethods & { ibanHolder: string | null; ibanHolderAddress: string | null; bicSwift: string | null; revolutTag: string | null };

function Feedback({ state }: { state: SchoolResult }) {
  if (state?.error) return <p style={{ color: "var(--danger)", fontSize: "var(--text-sm)", margin: 0 }}>{state.error}</p>;
  if (state?.success) return <p style={{ color: "var(--success)", fontSize: "var(--text-sm)", margin: 0 }}>{state.success}</p>;
  return null;
}

function ChecklistItem({ done, title, hint }: { done: boolean; title: string; hint: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: "var(--text-sm)" }}>
      <span aria-hidden style={{ flexShrink: 0, width: 18, textAlign: "center", color: done ? "var(--success)" : "var(--text-secondary)" }}>{done ? "✓" : "○"}</span>
      <div>
        <div style={{ color: "var(--text-primary)" }}>{title}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{hint}</div>
      </div>
    </div>
  );
}

export function SchoolStatusPanel({
  schoolId,
  status,
  missing,
  directorCount,
  activeStudents,
  payment,
  merchant,
  bank,
  legalDataReady,
}: {
  schoolId: string;
  status: SchoolStatus;
  missing: string[];
  directorCount: number;
  activeStudents: number;
  payment: PaymentFormValues | null;
  merchant: SchoolMerchantStatus;
  bank: SchoolBankStatus;
  legalDataReady: boolean;
}) {
  const [openState, openAction] = useActionState(openSchool, null as SchoolResult);
  const [deactivateState, deactivateAction] = useActionState(deactivateSchool, null as SchoolResult);
  const [paymentState, paymentAction] = useActionState(saveSchoolPaymentMethods, null as SchoolResult);
  const titleStyle = { margin: "0 0 var(--space-3) 0", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="card" style={{ padding: "var(--space-4)" }}>
        <h2 style={titleStyle}>{status === "PREPARACAO" ? "Arranque" : "Estado da escola"}</h2>
        <ChecklistItem done title="Graduação e biblioteca da rede" hint="Herdadas automaticamente" />
        <ChecklistItem done={directorCount > 0} title="Diretor técnico" hint="Na tab Equipa" />
        <ChecklistItem done={hasPaymentMethod(payment)} title="Meio de pagamento" hint="IBAN, MB Way, Revolut ou Multibanco" />
        <ChecklistItem done={legalDataReady} title="Dados legais para o contrato" hint="Denominação social, NIPC e sede, na tab Dados" />

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          {status === "ATIVA" ? (
            <form
              action={deactivateAction}
              onSubmit={(e) => {
                if (!window.confirm("Desativar esta escola? Os dados e o histórico ficam guardados.")) e.preventDefault();
              }}
            >
              <input type="hidden" name="schoolId" value={schoolId} />
              <button type="submit" className="btn btn-secondary" style={{ fontSize: "var(--text-sm)", color: "var(--warning)" }} disabled={activeStudents > 0}>
                Desativar escola
              </button>
              {activeStudents > 0 && (
                <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                  Tem {activeStudents} aluno(s) ativo(s): muda-os de escola ou inativa-os primeiro.
                </p>
              )}
            </form>
          ) : (
            <form
              action={openAction}
              onSubmit={(e) => {
                if (!window.confirm("Abrir esta escola? Passa a aparecer aos alunos, ao ranking e às inscrições.")) e.preventDefault();
              }}
            >
              <input type="hidden" name="schoolId" value={schoolId} />
              <button type="submit" className="btn btn-primary" style={{ fontSize: "var(--text-sm)" }} disabled={missing.length > 0}>
                {status === "PREPARACAO" ? "Abrir escola" : "Reativar escola"}
              </button>
              {missing.length > 0 && (
                <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Falta: {missing.join(", ")}.</p>
              )}
            </form>
          )}
          <Feedback state={openState} />
          <Feedback state={deactivateState} />
        </div>
      </div>

      <SchoolRevolutPanel schoolId={schoolId} status={merchant} />
      <SchoolBankPanel schoolId={schoolId} status={bank} />

      <form action={paymentAction} className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <h2 style={{ ...titleStyle, margin: 0 }}>Meios de pagamento</h2>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", lineHeight: 1.5, color: "var(--text-secondary)" }}>
          Os alunos desta escola veem e pagam para estes dados. O Multibanco por escola ainda não está disponível.
        </p>
        <input type="hidden" name="schoolId" value={schoolId} />
        <input name="ibanHolder" defaultValue={payment?.ibanHolder ?? ""} placeholder="Titular da conta" className="input" style={{ fontSize: "var(--text-sm)" }} />
        <input name="ibanHolderAddress" defaultValue={payment?.ibanHolderAddress ?? ""} placeholder="Morada do titular" className="input" style={{ fontSize: "var(--text-sm)" }} />
        <input name="iban" defaultValue={payment?.iban ?? ""} placeholder="IBAN" className="input" style={{ fontSize: "var(--text-sm)" }} />
        <input name="bicSwift" defaultValue={payment?.bicSwift ?? ""} placeholder="BIC/SWIFT" className="input" style={{ fontSize: "var(--text-sm)" }} />
        <input name="revolutTag" defaultValue={payment?.revolutTag ?? ""} placeholder="Revolut tag (ex.: @escola)" className="input" style={{ fontSize: "var(--text-sm)" }} />
        <input name="mbwayPhone" defaultValue={payment?.mbwayPhone ?? ""} placeholder="Telemóvel MB Way" inputMode="numeric" className="input" style={{ fontSize: "var(--text-sm)" }} />
        <button type="submit" className="btn btn-secondary" style={{ alignSelf: "flex-start", fontSize: "var(--text-sm)" }}>
          Guardar meios de pagamento
        </button>
        <Feedback state={paymentState} />
        <FormLoadingModal message="A guardar meios de pagamento…" />
      </form>
    </div>
  );
}
