import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

/** Nome do aluno + plano actual, no topo da barra lateral e do menu «Conta»; leva a «Plano e pagamentos». */
export function AccountPlanChip({
  displayName,
  planName,
  locale,
}: {
  displayName: string | null;
  planName: string | null;
  locale: "pt" | "en";
}) {
  const pt = locale === "pt";
  return (
    <Link
      href={planName ? "/dashboard/financeiro" : "/escolher-plano"}
      aria-label={planName ? `${pt ? "O meu plano" : "My plan"}: ${planName}` : pt ? "Escolher plano" : "Choose a plan"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg)",
        color: "var(--text-primary)",
        textDecoration: "none",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        {displayName ? (
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </span>
        ) : null}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginTop: displayName ? 4 : 0,
            padding: "2px 8px",
            borderRadius: 999,
            backgroundColor: planName ? "var(--primary)" : "transparent",
            border: planName ? "none" : "1px dashed var(--border)",
            color: planName ? "#fff" : "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 700,
            maxWidth: "100%",
          }}
        >
          <Sparkles size={12} aria-hidden />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {planName ?? (pt ? "Sem plano" : "No plan")}
          </span>
        </span>
      </span>
      <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
    </Link>
  );
}
