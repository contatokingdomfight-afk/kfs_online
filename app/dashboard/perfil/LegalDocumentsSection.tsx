import Link from "next/link";

type Props = {
  locale: "pt" | "en";
  waiverSigned: boolean;
  waiverSignedAt: string | null;
  enrollmentFormCompleted: boolean;
  enrollmentFormCompletedAt: string | null;
  agreementSigned: boolean;
  agreementSignedAt: string | null;
  agreementSignatureName: string | null;
};

export function LegalDocumentsSection({
  locale,
  waiverSigned,
  waiverSignedAt,
  enrollmentFormCompleted,
  enrollmentFormCompletedAt,
  agreementSigned,
  agreementSignedAt,
  agreementSignatureName,
}: Props) {
  const pt = locale === "pt";
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(pt ? "pt-PT" : "en-GB", { dateStyle: "long" }) : null;

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", marginTop: 20 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>
        {pt ? "Documentos legais" : "Legal documents"}
      </h2>
      <ul style={{ margin: "0 0 16px", paddingLeft: 18, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <li>
          {pt ? "Comprovativo de adesão:" : "Enrollment form:"}{" "}
          {enrollmentFormCompleted
            ? pt
              ? `Aceite${fmt(enrollmentFormCompletedAt) ? ` em ${fmt(enrollmentFormCompletedAt)}` : ""}`
              : `Accepted${fmt(enrollmentFormCompletedAt) ? ` on ${fmt(enrollmentFormCompletedAt)}` : ""}`
            : pt
              ? "Pendente"
              : "Pending"}
        </li>
        <li>
          {pt ? "Contrato de adesão:" : "Membership agreement:"}{" "}
          {agreementSigned
            ? pt
              ? `Assinado${agreementSignatureName ? ` por ${agreementSignatureName}` : ""}${
                  fmt(agreementSignedAt) ? ` em ${fmt(agreementSignedAt)}` : ""
                }`
              : `Signed${agreementSignatureName ? ` by ${agreementSignatureName}` : ""}${
                  fmt(agreementSignedAt) ? ` on ${fmt(agreementSignedAt)}` : ""
                }`
            : pt
              ? "Pendente"
              : "Pending"}
        </li>
        <li>
          {pt ? "Termo de responsabilidade:" : "Liability waiver:"}{" "}
          {waiverSigned
            ? pt
              ? `Assinado${fmt(waiverSignedAt) ? ` em ${fmt(waiverSignedAt)}` : ""}`
              : `Signed${fmt(waiverSignedAt) ? ` on ${fmt(waiverSignedAt)}` : ""}`
            : pt
              ? "Pendente"
              : "Pending"}
        </li>
      </ul>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 14 }}>
        <Link href="/dashboard/documentos-adesao" style={{ color: "var(--accent)" }}>
          {pt ? "Ver documentos de adesão" : "View membership documents"}
        </Link>
        <Link href="/termos" style={{ color: "var(--accent)" }}>
          {pt ? "Termos da plataforma" : "Platform terms"}
        </Link>
        <Link href="/privacidade" style={{ color: "var(--accent)" }}>
          {pt ? "Privacidade" : "Privacy"}
        </Link>
        {!agreementSigned ? (
          <Link href="/adesao" style={{ color: "var(--accent)" }}>
            {pt ? "Completar adesão" : "Complete membership"}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
