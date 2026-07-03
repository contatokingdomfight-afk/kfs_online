"use client";

import type { FinancialExpenseRow } from "@/lib/admin-finance-overview";
import { paymentMethodLabelPt } from "@/lib/finance-payment-method";
import { EXPENSE_CATEGORY_LABELS_PT } from "@/lib/retail/constants";
import { deleteFinancialExpense } from "../actions";

type Labels = {
  formKindFixed: string;
  formKindVariable: string;
  editExpenseAction: string;
  deleteLabel: string;
};

type Props = {
  expenses: FinancialExpenseRow[];
  locale: "pt" | "en";
  labels: Labels;
  onEdit: (id: string) => void;
};

function formatMoney(n: number, locale: "pt" | "en") {
  return n.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(yyyyMmDd: string, locale: "pt" | "en") {
  const d = new Date(yyyyMmDd + "T12:00:00Z");
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const chipStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "3px 8px",
  borderRadius: "var(--radius-md)",
  backgroundColor: "var(--bg-secondary)",
  color: "var(--text-secondary)",
  whiteSpace: "nowrap",
};

export function ExpenseList({ expenses, locale, labels, onEdit }: Props) {
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {expenses.map((e) => (
        <li
          key={e.id}
          className="card"
          style={{
            padding: "clamp(12px, 3vw, 14px)",
            background: "var(--bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: "clamp(14px, 3.5vw, 15px)",
                color: "var(--text-primary)",
                wordBreak: "break-word",
                flex: 1,
                minWidth: 0,
                lineHeight: 1.35,
              }}
            >
              {e.description}
            </p>
            <span
              style={{
                fontWeight: 700,
                fontSize: "clamp(14px, 3.5vw, 15px)",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {formatMoney(e.amount, locale)}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <span style={chipStyle}>{formatDate(e.occurredOn, locale)}</span>
            <span style={chipStyle}>{e.kind === "FIXED" ? labels.formKindFixed : labels.formKindVariable}</span>
            <span style={chipStyle}>{EXPENSE_CATEGORY_LABELS_PT[e.category] ?? e.category}</span>
            <span style={chipStyle}>{paymentMethodLabelPt(e.paymentMethod)}</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "6px 14px", flex: "1 1 auto", minWidth: 0 }}
              onClick={() => onEdit(e.id)}
            >
              {labels.editExpenseAction}
            </button>
            <form action={deleteFinancialExpense} style={{ margin: 0, flex: "1 1 auto", minWidth: 0 }}>
              <input type="hidden" name="id" value={e.id} />
              <button
                type="submit"
                className="btn"
                style={{ fontSize: 13, padding: "6px 14px", width: "100%" }}
              >
                {labels.deleteLabel}
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
