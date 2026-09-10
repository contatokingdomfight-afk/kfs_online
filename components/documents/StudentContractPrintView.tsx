import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { MEMBERSHIP_AGREEMENT_BODY_PT } from "@/lib/membership-agreement-content";
import { loadEnrollmentFormPrefill, type EnrollmentFormRow } from "@/lib/enrollment-form";
import { EnrollmentFormSummary } from "@/app/adesao/EnrollmentFormSummary";
import { PrintDocumentButton } from "@/components/documents/PrintDocumentButton";

function fmtDateTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });
}

type Props = {
  studentId: string;
  /** Para onde volta o "← Voltar" e os avisos de "nada para imprimir ainda". */
  backHref: string;
};

/**
 * Vista de impressão do contrato de adesão (Condições Gerais + comprovativo), partilhada entre
 * a ficha do aluno em /admin e em /coach — mesmo conteúdo, só muda o `backHref` e a autorização
 * de acesso (feita pela página que usa este componente, não aqui).
 */
export async function StudentContractPrintView({ studentId, backHref }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: student }, { data: agreement }, { data: enrollmentForm }] = await Promise.all([
    supabase.from("Student").select("userId").eq("id", studentId).single(),
    supabase
      .from("StudentMembershipAgreement")
      .select("agreementSigned, agreementSignedAt, signatureName, signatureImageUrl, agreementVersion")
      .eq("studentId", studentId)
      .maybeSingle(),
    supabase.from("StudentEnrollmentForm").select("*").eq("studentId", studentId).maybeSingle(),
  ]);

  if (!student) return null;

  if (!agreement?.agreementSigned || !enrollmentForm?.formCompleted) {
    return (
      <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
        <p style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>
          O aluno ainda não preencheu e assinou o contrato de adesão na plataforma — não há nada para
          imprimir ainda.
        </p>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const prefill = await loadEnrollmentFormPrefill(supabase, studentId, student.userId);
  if (!prefill) {
    return (
      <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
        <p style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>
          Falta o aluno ter um plano atribuído para gerar o contrato completo.
        </p>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
        <PrintDocumentButton />
      </div>

      <EnrollmentFormSummary
        form={enrollmentForm as EnrollmentFormRow}
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

      <section className="card" style={{ marginTop: 16, padding: "clamp(16px, 4vw, 24px)" }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700 }}>Condições Gerais de Adesão</h1>
        <dl style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", display: "grid", gap: 6 }}>
          {agreement.signatureName ? (
            <div>
              <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>Assinado digitalmente por: </dt>
              <dd style={{ display: "inline", margin: 0 }}>{agreement.signatureName}</dd>
            </div>
          ) : null}
          {agreement.agreementSignedAt ? (
            <div>
              <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>Data da assinatura: </dt>
              <dd style={{ display: "inline", margin: 0 }}>{fmtDateTime(agreement.agreementSignedAt as string)}</dd>
            </div>
          ) : null}
          <div>
            <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>Versão: </dt>
            <dd style={{ display: "inline", margin: 0 }}>
              {(agreement as { agreementVersion?: string | null }).agreementVersion ?? "1"}
            </dd>
          </div>
        </dl>
        {agreement.signatureImageUrl ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Assinatura digital (desenhada na app):
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={agreement.signatureImageUrl}
              alt="Assinatura desenhada"
              style={{ maxWidth: 220, background: "#fff", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
            />
          </div>
        ) : null}
        <div
          style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)" }}
          dangerouslySetInnerHTML={{ __html: MEMBERSHIP_AGREEMENT_BODY_PT }}
        />
      </section>

      <section className="card" style={{ marginTop: 16, padding: "clamp(16px, 4vw, 24px)" }}>
        <p style={{ margin: "0 0 40px", fontSize: 13, color: "var(--text-secondary)" }}>
          O(A) Sócio(a) já assinou digitalmente este contrato na plataforma (ver acima). Esta cópia
          impressa destina-se a recolher também a assinatura física, para arquivo em papel.
        </p>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, maxWidth: 320 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Assinatura do(a) Sócio(a) (física)</p>
        </div>
        <p style={{ marginTop: 24, marginBottom: 0, fontSize: 13, color: "var(--text-secondary)" }}>
          Data: ____ / ____ / ______
        </p>
      </section>
    </div>
  );
}
