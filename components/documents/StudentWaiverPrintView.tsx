import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { WAIVER_BODY_PT } from "@/lib/waiver-content";
import { PrintDocumentButton } from "@/components/documents/PrintDocumentButton";
import { AutoPrintTrigger } from "@/components/documents/AutoPrintTrigger";
import { PrintDocumentTitle } from "@/components/documents/PrintDocumentTitle";
import { SchoolSignatureBlock } from "@/components/documents/SchoolSignatureBlock";
import { getActiveSchoolSignatures } from "@/lib/school-signatures";
import { buildMembershipPrintDocumentTitle, loadStudentPrintName } from "@/lib/print-document-title";

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
 * Vista de impressão do Termo de Responsabilidade — espelha StudentContractPrintView.tsx
 * (Condições Gerais), que já tinha o seu próprio print; o Termo não tinha nenhum até agora.
 */
export async function StudentWaiverPrintView({ studentId, backHref }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: student }, { data: waiver }] = await Promise.all([
    supabase.from("Student").select("id, userId").eq("id", studentId).single(),
    supabase
      .from("StudentWaiver")
      .select("waiverSigned, waiverSignedAt, signatureName, signatureImageUrl, waiverVersion, guardianName, isMinor")
      .eq("studentId", studentId)
      .maybeSingle(),
  ]);

  if (!student) return null;

  if (!waiver?.waiverSigned) {
    return (
      <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
        <p style={{ margin: "0 0 16px", color: "var(--text-secondary)" }}>
          O aluno ainda não assinou o Termo de Responsabilidade na plataforma — não há nada para
          imprimir ainda.
        </p>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const schoolSignatures = await getActiveSchoolSignatures();
  const studentName = await loadStudentPrintName(supabase, studentId, waiver.signatureName);
  const printTitle = buildMembershipPrintDocumentTitle("termo", studentName);

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <PrintDocumentTitle title={printTitle} />
      <AutoPrintTrigger />
      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Link href={backHref} className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
        <PrintDocumentButton label="Imprimir Termo de Responsabilidade" />
      </div>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 24px)" }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700 }}>Termo de Responsabilidade</h1>
        <dl style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)", display: "grid", gap: 6 }}>
          {waiver.signatureName ? (
            <div>
              <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>Assinado digitalmente por: </dt>
              <dd style={{ display: "inline", margin: 0 }}>{waiver.signatureName}</dd>
            </div>
          ) : null}
          {waiver.isMinor && waiver.guardianName ? (
            <div>
              <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>Encarregado de educação: </dt>
              <dd style={{ display: "inline", margin: 0 }}>{waiver.guardianName}</dd>
            </div>
          ) : null}
          {waiver.waiverSignedAt ? (
            <div>
              <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>Data da assinatura: </dt>
              <dd style={{ display: "inline", margin: 0 }}>{fmtDateTime(waiver.waiverSignedAt as string)}</dd>
            </div>
          ) : null}
          <div>
            <dt style={{ fontWeight: 600, color: "var(--text-primary)", display: "inline" }}>Versão: </dt>
            <dd style={{ display: "inline", margin: 0 }}>{waiver.waiverVersion ?? "1"}</dd>
          </div>
        </dl>
        {waiver.signatureImageUrl ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Assinatura digital (desenhada na app):
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={waiver.signatureImageUrl}
              alt="Assinatura desenhada"
              style={{ maxWidth: 220, background: "#fff", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
            />
          </div>
        ) : null}
        <SchoolSignatureBlock signatures={schoolSignatures} />
        <div
          style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", marginTop: schoolSignatures.length > 0 ? 20 : 0 }}
          dangerouslySetInnerHTML={{ __html: WAIVER_BODY_PT }}
        />
      </section>

      <section className="card" style={{ marginTop: 16, padding: "clamp(16px, 4vw, 24px)" }}>
        <p style={{ margin: "0 0 40px", fontSize: 13, color: "var(--text-secondary)" }}>
          O(A) Sócio(a) já assinou digitalmente este termo na plataforma (ver acima). Esta cópia
          impressa destina-se a recolher também a assinatura física, para arquivo em papel.
        </p>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, maxWidth: 320 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
            {waiver.isMinor ? "Assinatura do encarregado de educação (física)" : "Assinatura do(a) Sócio(a) (física)"}
          </p>
        </div>
        <p style={{ marginTop: 24, marginBottom: 0, fontSize: 13, color: "var(--text-secondary)" }}>
          Data: ____ / ____ / ______
        </p>
      </section>
    </div>
  );
}
