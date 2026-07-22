import Link from "next/link";
import { EnrollmentFormSummary } from "@/app/adesao/EnrollmentFormSummary";
import { MEMBERSHIP_AGREEMENT_BODY_PT } from "@/lib/membership-agreement-content";
import type { EnrollmentFormRow } from "@/lib/enrollment-form";

type AgreementInfo = {
  agreementSigned: boolean;
  agreementSignedAt: string | null;
  signatureName: string | null;
  agreementVersion: string | null;
};

type EnrollmentInfo = {
  formCompleted: boolean;
  formCompletedAt: string | null;
  formVersion: string | null;
};

type Prefill = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  planName: string;
  modalityLabel: string | null;
  monthlyAmount: number;
  enrollmentAmount: number;
  insuranceAmount: number;
  showEnrollment: boolean;
  showInsurance: boolean;
};

type Props = {
  locale: "pt" | "en";
  agreement: AgreementInfo;
  enrollment: EnrollmentInfo;
  enrollmentForm: EnrollmentFormRow | null;
  prefill: Prefill | null;
  hasPlan: boolean;
};

function fmtDateTime(iso: string | null, locale: "pt" | "en"): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(locale === "pt" ? "pt-PT" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function StatusBadge({
  ok,
  okLabel,
  pendingLabel,
}: {
  ok: boolean;
  okLabel: string;
  pendingLabel: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: ok ? "color-mix(in srgb, #16a34a 15%, transparent)" : "color-mix(in srgb, var(--danger) 12%, transparent)",
        color: ok ? "#16a34a" : "var(--danger)",
      }}
    >
      {ok ? okLabel : pendingLabel}
    </span>
  );
}

export function MembershipDocumentsReadView({
  locale,
  agreement,
  enrollment,
  enrollmentForm,
  prefill,
  hasPlan,
}: Props) {
  const pt = locale === "pt";
  const allComplete = agreement.agreementSigned && enrollment.formCompleted;

  return (
    <div style={{ maxWidth: "min(720px, 100%)", display: "flex", flexDirection: "column", gap: 20 }}>
      {!allComplete ? (
        <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", fontSize: 14, lineHeight: 1.55 }}>
          <p style={{ margin: "0 0 12px", color: "var(--text-secondary)" }}>
            {pt
              ? "Ainda não concluíste todos os passos da adesão. Completa o comprovativo e assina o contrato para activar a tua inscrição."
              : "You have not completed all membership steps yet."}
          </p>
          {hasPlan ? (
            <Link href="/adesao" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
              {pt ? "Continuar adesão" : "Continue membership"}
            </Link>
          ) : (
            <Link href="/escolher-plano" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
              {pt ? "Escolher plano" : "Choose a plan"}
            </Link>
          )}
        </section>
      ) : null}

      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, flex: 1 }}>
            {pt ? "Comprovativo de Adesão" : "Enrollment form"}
          </h2>
          <StatusBadge
            ok={enrollment.formCompleted}
            okLabel={pt ? "Aceite" : "Accepted"}
            pendingLabel={pt ? "Pendente" : "Pending"}
          />
        </div>
        {enrollment.formCompleted ? (
          <p style={{ margin: "0 0 12px" }}>
            <Link
              href="/dashboard/documentos-adesao/imprimir/comprovativo"
              className="btn btn-secondary"
              style={{ textDecoration: "none", fontSize: 13, display: "inline-block" }}
            >
              {pt ? "Imprimir / Guardar PDF" : "Print / Save PDF"}
            </Link>
          </p>
        ) : null}
        {enrollment.formCompleted ? (
          <dl style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)", display: "grid", gap: 6 }}>
            {enrollment.formCompletedAt ? (
              <div>
                <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>
                  {pt ? "Data de aceite: " : "Accepted on: "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{fmtDateTime(enrollment.formCompletedAt, locale)}</dd>
              </div>
            ) : null}
            {enrollment.formVersion ? (
              <div>
                <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>
                  {pt ? "Versão: " : "Version: "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{enrollment.formVersion}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary)" }}>
            {pt ? "Comprovativo ainda não preenchido." : "Enrollment form not completed yet."}
          </p>
        )}
        {enrollmentForm && prefill ? (
          <EnrollmentFormSummary
            form={enrollmentForm}
            fullName={prefill.fullName}
            email={prefill.email}
            dateOfBirth={prefill.dateOfBirth}
            phone={prefill.phone}
            planName={prefill.planName}
            modalityLabel={prefill.modalityLabel}
            monthlyAmount={prefill.monthlyAmount}
            enrollmentAmount={prefill.enrollmentAmount}
            insuranceAmount={prefill.insuranceAmount}
            showEnrollment={prefill.showEnrollment}
            showInsurance={prefill.showInsurance}
          />
        ) : null}
      </section>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, flex: 1 }}>
            {pt ? "Condições Gerais de Adesão" : "Membership terms"}
          </h2>
          <StatusBadge
            ok={agreement.agreementSigned}
            okLabel={pt ? "Assinado" : "Signed"}
            pendingLabel={pt ? "Pendente" : "Pending"}
          />
        </div>
        {agreement.agreementSigned ? (
          <p style={{ margin: "0 0 12px" }}>
            <Link
              href="/dashboard/documentos-adesao/imprimir/contrato"
              className="btn btn-secondary"
              style={{ textDecoration: "none", fontSize: 13, display: "inline-block" }}
            >
              {pt ? "Imprimir / Guardar PDF" : "Print / Save PDF"}
            </Link>
          </p>
        ) : null}
        {agreement.agreementSigned ? (
          <dl style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)", display: "grid", gap: 6 }}>
            {agreement.signatureName ? (
              <div>
                <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>
                  {pt ? "Assinado por: " : "Signed by: "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{agreement.signatureName}</dd>
              </div>
            ) : null}
            {agreement.agreementSignedAt ? (
              <div>
                <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>
                  {pt ? "Data da assinatura: " : "Signed on: "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{fmtDateTime(agreement.agreementSignedAt, locale)}</dd>
              </div>
            ) : null}
            {agreement.agreementVersion ? (
              <div>
                <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>
                  {pt ? "Versão: " : "Version: "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{agreement.agreementVersion}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary)" }}>
            {pt ? "Contrato ainda não assinado." : "Contract not signed yet."}
          </p>
        )}
        <div
          style={{
            padding: "clamp(16px, 4vw, 20px)",
            maxHeight: "min(60vh, 520px)",
            overflowY: "auto",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)",
          }}
          dangerouslySetInnerHTML={{ __html: MEMBERSHIP_AGREEMENT_BODY_PT }}
        />
      </section>
    </div>
  );
}
