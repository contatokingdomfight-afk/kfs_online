"use client";

import { FormLoadingModal } from "@/components/FormLoadingModal";
import type { CashDepositRow } from "@/lib/cash-balance";
import { deleteCashDeposit } from "../actions";

type Props = {
  deposits: CashDepositRow[];
  locale: "pt" | "en";
  deleteLabel: string;
  deletingLabel: string;
};

function formatMoney(n: number, locale: "pt" | "en") {
  return n.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

export function CashDepositRecentList({ deposits, locale, deleteLabel, deletingLabel }: Props) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {deposits.map((d) => (
        <li
          key={d.id}
          style={{
            fontSize: 13,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "8px 12px",
            justifyContent: "space-between",
            borderTop: "1px solid var(--border)",
            paddingTop: 8,
          }}
        >
          <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>{d.occurredOn}</span>
          <span style={{ flex: 1, minWidth: 100, wordBreak: "break-word" }}>{d.description ?? "—"}</span>
          <strong style={{ whiteSpace: "nowrap" }}>{formatMoney(d.amount, locale)}</strong>
          <form action={deleteCashDeposit} style={{ margin: 0, flexShrink: 0 }}>
            <FormLoadingModal message={deletingLabel} />
            <input type="hidden" name="id" value={d.id} />
            <button type="submit" className="btn" style={{ fontSize: 12, padding: "4px 10px" }}>
              {deleteLabel}
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
