"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  renewStudentInsurance,
  registerInsurancePayment,
  updateStudentInsuranceCoverage,
  clearStudentInsuranceCoverage,
  type InsuranceActionResult,
} from "../insurance-actions";
import {
  computeInsuranceStatus,
  INSURANCE_STATUS_LABEL,
  type InsuranceCoverageRow,
} from "@/lib/insurance-settings";

type WaiverInfo = {
  waiverSigned: boolean;
  waiverSignedAt: string | null;
  signatureName: string | null;
};

type MembershipAgreementInfo = {
  agreementSigned: boolean;
  agreementSignedAt: string | null;
  signatureName: string | null;
};

type EnrollmentFormInfo = {
  formCompleted: boolean;
  formCompletedAt: string | null;
  taxId: string | null;
  idDocument: string | null;
  paymentMethod: string | null;
  debitIban: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  paymentProofFileName: string | null;
  paymentProofUploadedAt: string | null;
};

type Props = {
  studentId: string;
  waiver: WaiverInfo | null;
  membershipAgreement: MembershipAgreementInfo | null;
  enrollmentForm: EnrollmentFormInfo | null;
  /** Link temporário (5 min) para o comprovativo de pagamento, gerado no servidor a cada carregamento da página. */
  paymentProofSignedUrl: string | null;
  coverage: InsuranceCoverageRow | null;
  annualAmount: number;
  defaultPolicyReference: string;
  todayYmd: string;
};

export function StudentInsuranceSection({
  studentId,
  waiver,
  membershipAgreement,
  enrollmentForm,
  paymentProofSignedUrl,
  coverage,
  annualAmount,
  defaultPolicyReference,
  todayYmd,
}: Props) {
  const router = useRouter();
  const [renewState, renewAction] = useFormState(renewStudentInsurance, null as InsuranceActionResult | null);
  const [payState, payAction] = useFormState(registerInsurancePayment, null as InsuranceActionResult | null);
  const [updateState, updateAction] = useFormState(updateStudentInsuranceCoverage, null as InsuranceActionResult | null);
  const [clearState, clearAction] = useFormState(clearStudentInsuranceCoverage, null as InsuranceActionResult | null);

  const insuranceStatus = computeInsuranceStatus(coverage, todayYmd);
  const currentYear = todayYmd.slice(0, 4);

  useEffect(() => {
    if (renewState?.success || payState?.success || updateState?.success || clearState?.success) {
      router.refresh();
    }
  }, [renewState?.success, payState?.success, updateState?.success, clearState?.success, router]);

  const statusColor =
    insuranceStatus === "covered"
      ? "#16a34a"
      : insuranceStatus === "expiring"
        ? "#ca8a04"
        : insuranceStatus === "expired"
          ? "var(--danger)"
          : "var(--text-secondary)";

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", marginTop: 20 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>Seguro, adesão e termo de responsabilidade</h2>

      <div style={{ marginBottom: 16, fontSize: 14, color: "var(--text-secondary)" }}>
        <p style={{ margin: "0 0 8px" }}>
          <strong>Comprovativo de adesão:</strong>{" "}
          {enrollmentForm?.formCompleted
            ? `Preenchido${
                enrollmentForm.formCompletedAt
                  ? ` em ${new Date(enrollmentForm.formCompletedAt).toLocaleDateString("pt-PT")}`
                  : ""
              }`
            : "Pendente"}
        </p>
        {enrollmentForm?.formCompleted ? (
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>
            NIF {enrollmentForm.taxId ?? "—"} · CC {enrollmentForm.idDocument ?? "—"}
            {enrollmentForm.paymentMethod ? ` · Pagamento: ${enrollmentForm.paymentMethod}` : ""}
            {enrollmentForm.emergencyContactName
              ? ` · Emergência: ${enrollmentForm.emergencyContactName} (${enrollmentForm.emergencyContactPhone ?? ""})`
              : ""}
          </p>
        ) : null}
        <p style={{ margin: "0 0 8px" }}>
          <strong>Comprovativo de pagamento:</strong>{" "}
          {paymentProofSignedUrl && enrollmentForm?.paymentProofFileName ? (
            <>
              <a href={paymentProofSignedUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                Ver ficheiro ({enrollmentForm.paymentProofFileName})
              </a>
              {enrollmentForm.paymentProofUploadedAt
                ? ` — enviado em ${new Date(enrollmentForm.paymentProofUploadedAt).toLocaleDateString("pt-PT")}`
                : ""}
            </>
          ) : (
            "Nenhum enviado"
          )}
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>Contrato de adesão:</strong>{" "}
          {membershipAgreement?.agreementSigned
            ? `Assinado${membershipAgreement.signatureName ? ` por ${membershipAgreement.signatureName}` : ""}${
                membershipAgreement.agreementSignedAt
                  ? ` em ${new Date(membershipAgreement.agreementSignedAt).toLocaleDateString("pt-PT")}`
                  : ""
              }`
            : "Pendente"}
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>Termo:</strong>{" "}
          {waiver?.waiverSigned
            ? `Assinado${waiver.signatureName ? ` por ${waiver.signatureName}` : ""}${
                waiver.waiverSignedAt ? ` em ${new Date(waiver.waiverSignedAt).toLocaleDateString("pt-PT")}` : ""
              }`
            : "Pendente"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Seguro:</strong>{" "}
          <span style={{ color: statusColor, fontWeight: 600 }}>{INSURANCE_STATUS_LABEL[insuranceStatus]}</span>
          {coverage?.coverageStartDate && coverage?.coverageEndDate ? (
            <span>
              {" "}
              ({coverage.coverageStartDate} → {coverage.coverageEndDate})
            </span>
          ) : null}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <form action={renewAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <button type="submit" className="btn btn-primary" style={{ fontSize: 14 }}>
            Renovar seguro (+1 ano)
          </button>
        </form>
        <form action={clearAction}>
          <input type="hidden" name="studentId" value={studentId} />
          <button type="submit" className="btn btn-secondary" style={{ fontSize: 14 }}>
            Marcar sem cobertura
          </button>
        </form>
      </div>
      {renewState?.error ? <p style={{ color: "var(--danger)", fontSize: 14 }}>{renewState.error}</p> : null}
      {clearState?.error ? <p style={{ color: "var(--danger)", fontSize: 14 }}>{clearState.error}</p> : null}

      <form action={payAction} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 20 }}>
        <input type="hidden" name="studentId" value={studentId} />
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Registar pagamento seguro (€)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={annualAmount > 0 ? String(annualAmount) : ""}
            className="input"
            style={{ width: 120 }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Ano</label>
          <input name="referenceYear" type="text" defaultValue={currentYear} className="input" style={{ width: 90 }} />
        </div>
        <button type="submit" className="btn btn-secondary" style={{ fontSize: 14 }}>
          Registar pagamento
        </button>
      </form>
      {payState?.error ? <p style={{ color: "var(--danger)", fontSize: 14 }}>{payState.error}</p> : null}

      <form action={updateAction} style={{ display: "grid", gap: 12 }}>
        <input type="hidden" name="studentId" value={studentId} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" name="covered" defaultChecked={coverage?.covered ?? false} />
          Coberto pelo seguro colectivo
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Início</label>
            <input
              name="coverageStartDate"
              type="date"
              defaultValue={coverage?.coverageStartDate ?? ""}
              className="input"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Fim</label>
            <input
              name="coverageEndDate"
              type="date"
              defaultValue={coverage?.coverageEndDate ?? ""}
              className="input"
            />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Apólice</label>
            <input
              name="policyReference"
              type="text"
              defaultValue={coverage?.policyReference ?? defaultPolicyReference}
              className="input w-full"
            />
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Notas</label>
          <textarea name="notes" rows={2} defaultValue={coverage?.notes ?? ""} className="input w-full" />
        </div>
        <button type="submit" className="btn btn-secondary" style={{ fontSize: 14, alignSelf: "flex-start" }}>
          Guardar cobertura
        </button>
        {updateState?.error ? <p style={{ color: "var(--danger)", fontSize: 14, margin: 0 }}>{updateState.error}</p> : null}
      </form>
    </section>
  );
}
