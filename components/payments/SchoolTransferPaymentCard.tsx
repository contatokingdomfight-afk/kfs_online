import { CopyTextButton } from "@/components/ui/CopyTextButton";
import type { EnrollmentSchoolDetails } from "@/lib/school-payment-rules";

type Props = {
  school: EnrollmentSchoolDetails;
  locale?: "pt" | "en";
  /** Referência fixa do aluno (ex.: KFS-0123) para o descritivo: confirma o pagamento sozinho na Sede. */
  paymentReference?: string | null;
};

type Row = { label: string; value: string; copyLabel?: string };

function introText(school: EnrollmentSchoolDetails, pt: boolean, paymentReference: string | null): string {
  const { transfer, mbwayPhone, cash, isSede } = school.payment;
  const parts: string[] = [];
  if (transfer) {
    if (!pt) parts.push("Use the details below for bank transfer.");
    else if (!paymentReference) parts.push("Para pagar por transferência, utiliza os dados abaixo.");
    // A confirmação automática só lê a conta bancária da Sede.
    else if (isSede) parts.push(`Para pagar por transferência, usa os dados abaixo e escreve ${paymentReference} no descritivo: assim o pagamento fica confirmado sozinho.`);
    else parts.push(`Para pagar por transferência, usa os dados abaixo e escreve ${paymentReference} no descritivo para a secretaria identificar o pagamento.`);
  }
  if (mbwayPhone) parts.push(pt ? "Para pagar por MB Way, envia para o número abaixo." : "To pay with MB Way, send to the number below.");
  if (cash) {
    if (!pt) parts.push("You can also pay cash at the school office.");
    else parts.push(paymentReference ? "Também podes pagar na secretaria." : "Também podes pagar em dinheiro na secretaria.");
  }
  return parts.join(" ");
}

export function SchoolTransferPaymentCard({ school, locale = "pt", paymentReference = null }: Props) {
  const pt = locale === "pt";
  const { identity, payment } = school;
  const { transfer, mbwayPhone, isSede } = payment;
  const copyIban = pt ? "Copiar IBAN" : "Copy IBAN";

  const rows: Row[] = [
    ...(identity
      ? [
          { label: pt ? "Empresa" : "Company", value: identity.name },
          { label: pt ? "Nome comercial" : "Trade name", value: identity.tradeName },
          { label: "NIPC", value: identity.nipc },
          { label: pt ? "Morada" : "Address", value: identity.address },
          { label: pt ? "Telefone" : "Phone", value: identity.phone },
          { label: "E-mail", value: identity.email },
        ].flatMap((r) => (r.value ? [{ label: r.label, value: r.value }] : []))
      : []),
    // Na Sede o titular é a própria empresa; nas outras escolas pode não ser.
    ...(transfer && !isSede && transfer.holder ? [{ label: pt ? "Titular" : "Account holder", value: transfer.holder }] : []),
    ...(transfer?.iban ? [{ label: "IBAN", value: transfer.iban, copyLabel: copyIban }] : []),
    ...(transfer && !isSede && transfer.bicSwift ? [{ label: "BIC / SWIFT", value: transfer.bicSwift }] : []),
    ...(transfer && !isSede && transfer.revolutTag ? [{ label: "Revolut", value: transfer.revolutTag }] : []),
    ...(mbwayPhone ? [{ label: "MB Way", value: mbwayPhone, copyLabel: pt ? "Copiar número" : "Copy number" }] : []),
    ...(paymentReference && (transfer || mbwayPhone)
      ? [{ label: pt ? "Descritivo (importante)" : "Reference (important)", value: paymentReference, copyLabel: pt ? "Copiar referência" : "Copy reference" }]
      : []),
  ];

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        display: "grid",
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55 }}>
        {introText(school, pt, paymentReference) ||
          (pt
            ? "A tua escola ainda não indicou como receber pagamentos. Fala com a escola."
            : "Your school has not set up payment details yet. Please contact the school.")}
      </p>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            fontSize: 14,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>{row.label}</div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", wordBreak: "break-all" }}>{row.value}</div>
          </div>
          {row.copyLabel ? <CopyTextButton text={row.value} label={row.copyLabel} /> : null}
        </div>
      ))}
    </div>
  );
}
