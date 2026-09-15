import { EnrollmentFormSummary } from "@/app/adesao/EnrollmentFormSummary";
import { MEMBERSHIP_AGREEMENT_BODY_PT } from "@/lib/membership-agreement-content";
import { WAIVER_BODY_PT } from "@/lib/waiver-content";
import type { EnrollmentFormRow } from "@/lib/enrollment-form";
import { SchoolSignatureBlock } from "@/components/documents/SchoolSignatureBlock";
import { MembershipDocumentSection } from "@/components/membership/MembershipDocumentSection";
import type { SchoolSignature } from "@/lib/school-signatures";
import Link from "next/link";

type AgreementInfo = {
  agreementSigned: boolean;
  agreementSignedAt: string | null;
  signatureName: string | null;
  signatureImageUrl: string | null;
  agreementVersion: string | null;
};

type WaiverInfo = {
  waiverSigned: boolean;
  waiverSignedAt: string | null;
  signatureName: string | null;
  signatureImageUrl: string | null;
  waiverVersion: string | null;
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
  primaryModality: string | null;
  modalityScope: string | null;
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
  waiver: WaiverInfo;
  enrollment: EnrollmentInfo;
  enrollmentForm: EnrollmentFormRow | null;
  prefill: Prefill | null;
  hasPlan: boolean;
  schoolSignatures: SchoolSignature[];
  /** Rotas de impressão dedicadas — por omissão, dashboard do aluno. */
  printComprovativoHref?: string;
  printContratoHref?: string;
  /** Banner «continuar adesão» — só no dashboard do aluno. */
  showIncompleteBanner?: boolean;
};

function fmtDateTime(iso: string | null, locale: "pt" | "en"): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString(locale === "pt" ? "pt-PT" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function MetaList({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  const visible = items.filter((i) => i.value);
  if (visible.length === 0) return null;
  return (
    <dl style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", display: "grid", gap: 6 }}>
      {visible.map((item) => (
        <div key={item.label}>
          <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>{item.label}: </dt>
          <dd style={{ display: "inline", margin: 0 }}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MembershipDocumentsReadView({
  locale,
  agreement,
  waiver,
  enrollment,
  enrollmentForm,
  prefill,
  hasPlan,
  schoolSignatures,
  printComprovativoHref = "/dashboard/documentos-adesao/imprimir/comprovativo",
  printContratoHref = "/dashboard/documentos-adesao/imprimir/contrato",
  showIncompleteBanner = true,
}: Props) {
  const pt = locale === "pt";
  const allComplete = agreement.agreementSigned && waiver.waiverSigned && enrollment.formCompleted;

  return (
    <div style={{ maxWidth: "min(720px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>
      {!allComplete && showIncompleteBanner ? (
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

      <MembershipDocumentSection
        title={pt ? "Comprovativo de Adesão" : "Enrollment form"}
        ok={enrollment.formCompleted}
        okLabel={pt ? "Aceite" : "Accepted"}
        pendingLabel={pt ? "Pendente" : "Pending"}
        printHref={printComprovativoHref}
        printLabel={pt ? "Imprimir" : "Print"}
        pendingMessage={pt ? "Comprovativo ainda não preenchido." : "Enrollment form not completed yet."}
        summary={
          enrollment.formCompleted ? (
            <MetaList
              items={[
                {
                  label: pt ? "Data de aceite" : "Accepted on",
                  value: fmtDateTime(enrollment.formCompletedAt, locale),
                },
                { label: pt ? "Versão" : "Version", value: enrollment.formVersion },
              ]}
            />
          ) : undefined
        }
      >
        {enrollmentForm && prefill ? (
          <EnrollmentFormSummary
            form={enrollmentForm}
            fullName={prefill.fullName}
            email={prefill.email}
            dateOfBirth={prefill.dateOfBirth}
            phone={prefill.phone}
            planName={prefill.planName}
            primaryModality={prefill.primaryModality}
            modalityScope={prefill.modalityScope}
            modalityLabel={prefill.modalityLabel}
            monthlyAmount={prefill.monthlyAmount}
            enrollmentAmount={prefill.enrollmentAmount}
            insuranceAmount={prefill.insuranceAmount}
            showEnrollment={prefill.showEnrollment}
            showInsurance={prefill.showInsurance}
            agreementSigned={agreement.agreementSigned}
            signatureName={agreement.signatureName}
            signatureImageUrl={agreement.signatureImageUrl}
            schoolSignatures={schoolSignatures}
          />
        ) : null}
      </MembershipDocumentSection>

      <MembershipDocumentSection
        title={pt ? "Condições Gerais de Adesão" : "Membership terms"}
        ok={agreement.agreementSigned}
        okLabel={pt ? "Assinado" : "Signed"}
        pendingLabel={pt ? "Pendente" : "Pending"}
        printHref={printContratoHref}
        printLabel={pt ? "Imprimir" : "Print"}
        pendingMessage={pt ? "Contrato ainda não assinado." : "Contract not signed yet."}
        summary={
          agreement.agreementSigned ? (
            <MetaList
              items={[
                { label: pt ? "Assinado por" : "Signed by", value: agreement.signatureName },
                {
                  label: pt ? "Data da assinatura" : "Signed on",
                  value: fmtDateTime(agreement.agreementSignedAt, locale),
                },
                { label: pt ? "Versão" : "Version", value: agreement.agreementVersion },
              ]}
            />
          ) : undefined
        }
      >
        {agreement.signatureImageUrl ? (
          <div style={{ margin: "0 0 16px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {pt ? "Assinatura" : "Signature"}
            </p>
            <img
              src={agreement.signatureImageUrl}
              alt={pt ? "Assinatura desenhada" : "Drawn signature"}
              style={{
                maxWidth: 260,
                background: "#fff",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            />
          </div>
        ) : null}
        <SchoolSignatureBlock
          signatures={schoolSignatures}
          title={pt ? "Pela Kingdom Fight School" : "For Kingdom Fight School"}
        />
        <div
          style={{
            marginTop: schoolSignatures.length > 0 ? 16 : 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-secondary)",
          }}
          dangerouslySetInnerHTML={{ __html: MEMBERSHIP_AGREEMENT_BODY_PT }}
        />
      </MembershipDocumentSection>

      <MembershipDocumentSection
        title={pt ? "Termo de Responsabilidade" : "Liability waiver"}
        ok={waiver.waiverSigned}
        okLabel={pt ? "Assinado" : "Signed"}
        pendingLabel={pt ? "Pendente" : "Pending"}
        pendingMessage={pt ? "Termo ainda não assinado." : "Waiver not signed yet."}
        summary={
          waiver.waiverSigned ? (
            <MetaList
              items={[
                { label: pt ? "Assinado por" : "Signed by", value: waiver.signatureName },
                {
                  label: pt ? "Data da assinatura" : "Signed on",
                  value: fmtDateTime(waiver.waiverSignedAt, locale),
                },
                { label: pt ? "Versão" : "Version", value: waiver.waiverVersion },
              ]}
            />
          ) : undefined
        }
      >
        {waiver.signatureImageUrl ? (
          <div style={{ margin: "0 0 16px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {pt ? "Assinatura" : "Signature"}
            </p>
            <img
              src={waiver.signatureImageUrl}
              alt={pt ? "Assinatura desenhada" : "Drawn signature"}
              style={{
                maxWidth: 260,
                background: "#fff",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            />
          </div>
        ) : null}
        <SchoolSignatureBlock
          signatures={schoolSignatures}
          title={pt ? "Pela Kingdom Fight School" : "For Kingdom Fight School"}
        />
        <div
          style={{
            marginTop: waiver.waiverSigned && schoolSignatures.length > 0 ? 16 : 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-secondary)",
          }}
          dangerouslySetInnerHTML={{ __html: WAIVER_BODY_PT }}
        />
      </MembershipDocumentSection>
    </div>
  );
}
