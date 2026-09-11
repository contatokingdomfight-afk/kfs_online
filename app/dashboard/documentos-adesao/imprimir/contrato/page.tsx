import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { MEMBERSHIP_AGREEMENT_BODY_PT } from "@/lib/membership-agreement-content";
import { PrintDocumentButton } from "@/components/documents/PrintDocumentButton";
import { SchoolSignatureBlock } from "@/components/documents/SchoolSignatureBlock";
import { getActiveSchoolSignatures } from "@/lib/school-signatures";

export const dynamic = "force-dynamic";

function fmtDateTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });
}

export default async function ImprimirContratoPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const supabase = await createClient();
  const settings = await getInsuranceSettings(supabase);
  const { data: agreement } = await supabase
    .from("StudentMembershipAgreement")
    .select("agreementSigned, agreementSignedAt, signatureName, signatureImageUrl, agreementVersion")
    .eq("studentId", studentId)
    .maybeSingle();

  if (!agreement?.agreementSigned) {
    redirect("/dashboard/documentos-adesao");
  }

  const schoolSignatures = await getActiveSchoolSignatures();

  return (
    <>
      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Link href="/dashboard/documentos-adesao" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
        <PrintDocumentButton />
      </div>
      <section className="card" style={{ padding: "clamp(16px, 4vw, 24px)" }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700 }}>Condições Gerais de Adesão</h1>
        <dl style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", display: "grid", gap: 6 }}>
          {agreement.signatureName ? (
            <div>
              <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>Assinado por: </dt>
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
              {(agreement as { agreementVersion?: string | null }).agreementVersion ?? settings.membershipAgreementVersion}
            </dd>
          </div>
        </dl>
        {(agreement as { signatureImageUrl?: string | null }).signatureImageUrl ? (
          <div style={{ margin: "0 0 20px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Assinatura
            </p>
            <img
              src={(agreement as { signatureImageUrl?: string | null }).signatureImageUrl as string}
              alt="Assinatura desenhada"
              style={{ maxWidth: 260, background: "#fff", border: "1px solid #ddd", borderRadius: 8 }}
            />
          </div>
        ) : null}
        <SchoolSignatureBlock signatures={schoolSignatures} />
        <div
          style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", marginTop: schoolSignatures.length > 0 ? 20 : 0 }}
          dangerouslySetInnerHTML={{ __html: MEMBERSHIP_AGREEMENT_BODY_PT }}
        />
        {(agreement as { signatureImageUrl?: string | null }).signatureImageUrl ? (
          <div style={{ margin: "24px 0 0", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Assinatura
            </p>
            <img
              src={(agreement as { signatureImageUrl?: string | null }).signatureImageUrl as string}
              alt="Assinatura desenhada"
              style={{ maxWidth: 260, background: "#fff", border: "1px solid #ddd", borderRadius: 8 }}
            />
            {agreement.signatureName ? (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                Assinado por: {agreement.signatureName}
              </p>
            ) : null}
            <SchoolSignatureBlock signatures={schoolSignatures} />
          </div>
        ) : null}
      </section>
    </>
  );
}
