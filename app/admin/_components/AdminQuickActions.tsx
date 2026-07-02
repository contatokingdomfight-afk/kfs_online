import Link from "next/link";

type Props = {
  registerSaleLabel: string;
  shopLabel: string;
  financeReportLabel: string;
};

export function AdminQuickActions({ registerSaleLabel, shopLabel, financeReportLabel }: Props) {
  return (
    <nav
      aria-label="Atalhos rápidos"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
        gap: 10,
        marginBottom: 4,
      }}
    >
      <Link
        href="/admin/loja/vendas/novo"
        className="btn btn-primary"
        style={{
          textDecoration: "none",
          textAlign: "center",
          padding: "clamp(12px, 3vw, 14px) 16px",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontWeight: 600,
        }}
      >
        {registerSaleLabel}
      </Link>
      <Link
        href="/admin/loja"
        className="btn btn-secondary"
        style={{
          textDecoration: "none",
          textAlign: "center",
          padding: "clamp(12px, 3vw, 14px) 16px",
          fontSize: "clamp(14px, 3.5vw, 16px)",
        }}
      >
        {shopLabel}
      </Link>
      <Link
        href="/admin/financeiro/relatorio"
        className="btn btn-secondary"
        style={{
          textDecoration: "none",
          textAlign: "center",
          padding: "clamp(12px, 3vw, 14px) 16px",
          fontSize: "clamp(14px, 3.5vw, 16px)",
        }}
      >
        {financeReportLabel}
      </Link>
    </nav>
  );
}
