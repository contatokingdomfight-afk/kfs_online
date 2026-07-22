import { GYM_ENROLLMENT_INFO, SCHOOL_TRANSFER_IBAN } from "@/lib/enrollment-form";
import { CopyTextButton } from "@/components/ui/CopyTextButton";

type Props = {
  locale?: "pt" | "en";
};

export function SchoolTransferPaymentCard({ locale = "pt" }: Props) {
  const pt = locale === "pt";

  const rows = [
    { label: pt ? "Empresa" : "Company", value: GYM_ENROLLMENT_INFO.name },
    { label: pt ? "Nome comercial" : "Trade name", value: GYM_ENROLLMENT_INFO.tradeName },
    { label: "NIPC", value: GYM_ENROLLMENT_INFO.nipc },
    { label: pt ? "Morada" : "Address", value: GYM_ENROLLMENT_INFO.address },
    { label: pt ? "Telefone" : "Phone", value: GYM_ENROLLMENT_INFO.phone },
    { label: "E-mail", value: GYM_ENROLLMENT_INFO.email },
    { label: "IBAN", value: SCHOOL_TRANSFER_IBAN, copy: true },
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
        {pt
          ? "Para pagar por transferência, utiliza os dados abaixo. Também podes pagar em dinheiro na secretaria."
          : "Use the details below for bank transfer. You can also pay cash at the school office."}
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
          {row.copy ? (
            <CopyTextButton text={row.value} label={pt ? "Copiar IBAN" : "Copy IBAN"} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
