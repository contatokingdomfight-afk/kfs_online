"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RenewalsSection } from "../RenewalsSection";
import { AddExpenseForm } from "./AddExpenseForm";
import { dedupeDuplicatePaymentsAction, deleteFinancialExpense } from "../actions";
import type { RenewalPending } from "@/lib/renewals";
import type { FinancialExpenseRow } from "@/lib/admin-finance-overview";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  overflow: "auto",
};

export type PaymentListRow = {
  id: string;
  displayName: string;
  status: string;
  referenceMonth: string;
  amount: number;
};

type ModalId = "renewals" | "payments" | "expenses";

type Labels = {
  modalsHint: string;
  close: string;
  paymentsModalTitle: string;
  filterAll: string;
  filterPaid: string;
  filterLate: string;
  statusPaid: string;
  statusLate: string;
  noPayments: string;
  noPaymentsFilter: string;
  dedupeButton: string;
  dedupeHelp: string;
  expensesTitle: string;
  expensesTableTitle: string;
  colDate: string;
  colDescription: string;
  colAmount: string;
  colActions: string;
  noExpenses: string;
  formAmount: string;
  formDescription: string;
  formDate: string;
  formSubmit: string;
  expenseSaved: string;
  deleteLabel: string;
  expenseErrorSuffix: string;
  openRenewals: string;
  openPayments: string;
  openExpenses: string;
};

type Props = {
  referenceMonth: string;
  renewalsPending: RenewalPending[];
  paymentRows: PaymentListRow[];
  expenses: FinancialExpenseRow[];
  expensesError: string | null;
  expenseErrorFromUrl: string | null;
  defaultExpenseDate: string;
  labels: Labels;
  formatMoney: (n: number) => string;
  formatTableDate: (isoDate: string) => string;
};

function modalCardStyle(maxWidth: number): React.CSSProperties {
  return {
    maxWidth,
    width: "100%",
    maxHeight: "min(88vh, 900px)",
    display: "flex",
    flexDirection: "column",
    padding: "clamp(18px, 4.5vw, 22px)",
    boxSizing: "border-box",
  };
}

export function FinanceiroModals({
  referenceMonth,
  renewalsPending,
  paymentRows: allPaymentRows,
  expenses,
  expensesError,
  expenseErrorFromUrl,
  defaultExpenseDate,
  labels,
  formatMoney,
  formatTableDate,
}: Props) {
  const [open, setOpen] = useState<ModalId | null>(null);
  const [mounted, setMounted] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "PAID" | "LATE">("all");
  const titleId = useId();
  const monthLabelShort = `${referenceMonth.slice(5)}/${referenceMonth.slice(0, 4)}`;

  useEffect(() => setMounted(true), []);

  const closeModal = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeModal]);

  const filteredPayments = useMemo(() => {
    if (filterStatus === "all") return allPaymentRows;
    return allPaymentRows.filter((p) => p.status === filterStatus);
  }, [allPaymentRows, filterStatus]);

  const modals = (
    <>
      {open === "renewals" && (
        <div style={overlayStyle} role="presentation" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId + "-r"}
            onClick={(e) => e.stopPropagation()}
            style={modalCardStyle(560)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
              <h2 id={titleId + "-r"} style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {labels.openRenewals} ({monthLabelShort})
              </h2>
              <button type="button" className="button" onClick={closeModal} style={{ flexShrink: 0 }}>
                {labels.close}
              </button>
            </div>
            <div style={{ overflow: "auto", minHeight: 0 }}>
              <RenewalsSection referenceMonth={referenceMonth} pending={renewalsPending} noOuterCard suppressTitle />
            </div>
          </div>
        </div>
      )}

      {open === "payments" && (
        <div style={overlayStyle} role="presentation" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId + "-p"}
            onClick={(e) => e.stopPropagation()}
            style={modalCardStyle(640)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <h2 id={titleId + "-p"} style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {labels.paymentsModalTitle}
              </h2>
              <button type="button" className="button" onClick={closeModal} style={{ flexShrink: 0 }}>
                {labels.close}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className="btn"
                style={{
                  backgroundColor: filterStatus === "all" ? "var(--primary)" : "var(--bg-secondary)",
                  color: filterStatus === "all" ? "#fff" : "var(--text-primary)",
                }}
              >
                {labels.filterAll}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("PAID")}
                className="btn"
                style={{
                  backgroundColor: filterStatus === "PAID" ? "var(--primary)" : "var(--bg-secondary)",
                  color: filterStatus === "PAID" ? "#fff" : "var(--text-primary)",
                }}
              >
                {labels.filterPaid}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("LATE")}
                className="btn"
                style={{
                  backgroundColor: filterStatus === "LATE" ? "var(--primary)" : "var(--bg-secondary)",
                  color: filterStatus === "LATE" ? "#fff" : "var(--text-primary)",
                }}
              >
                {labels.filterLate}
              </button>
            </div>
            <form action={dedupeDuplicatePaymentsAction} style={{ marginBottom: 12 }}>
              <button type="submit" className="btn" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                {labels.dedupeButton}
              </button>
              <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{labels.dedupeHelp}</p>
            </form>
            <div style={{ overflow: "auto", minHeight: 0, flex: 1 }}>
              {filteredPayments.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>
                  {allPaymentRows.length === 0 ? labels.noPayments : labels.noPaymentsFilter}
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {filteredPayments.map((p) => (
                    <li key={p.id} className="card" style={{ padding: 12 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.displayName}</span>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: p.status === "PAID" ? "var(--success)" : "var(--danger)",
                            color: "#fff",
                          }}
                        >
                          {p.status === "PAID" ? labels.statusPaid : labels.statusLate}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
                        {p.referenceMonth} · {p.amount.toFixed(2)} €
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {open === "expenses" && (
        <div style={overlayStyle} role="presentation" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId + "-e"}
            onClick={(e) => e.stopPropagation()}
            style={modalCardStyle(700)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <h2 id={titleId + "-e"} style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {labels.expensesTitle}
              </h2>
              <button type="button" className="button" onClick={closeModal} style={{ flexShrink: 0 }}>
                {labels.close}
              </button>
            </div>
            {expenseErrorFromUrl && (
              <p role="alert" className="card" style={{ padding: 10, color: "var(--error)", marginBottom: 10, fontSize: 13 }}>
                {decodeURIComponent(expenseErrorFromUrl.replace(/\+/g, " "))}
              </p>
            )}
            {expensesError && (
              <p role="alert" className="card" style={{ padding: 10, color: "var(--error)", marginBottom: 10, fontSize: 13 }}>
                {expensesError}
                {` ${labels.expenseErrorSuffix}`}
              </p>
            )}

            <div style={{ overflow: "auto", minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <AddExpenseForm
                defaultDate={defaultExpenseDate}
                labels={{
                  amount: labels.formAmount,
                  description: labels.formDescription,
                  date: labels.formDate,
                  submit: labels.formSubmit,
                  success: labels.expenseSaved,
                }}
              />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{labels.expensesTableTitle}</h3>
              {expenses.length === 0 && !expensesError ? (
                <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{labels.noExpenses}</p>
              ) : expensesError && !expenses.length ? null : (
                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid var(--card-border, rgba(0,0,0,.1))",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "var(--bg-secondary)", textAlign: "left" }}>
                        <th style={{ padding: "8px 10px" }}>{labels.colDate}</th>
                        <th style={{ padding: "8px 10px" }}>{labels.colDescription}</th>
                        <th style={{ padding: "8px 10px" }}>{labels.colAmount}</th>
                        <th style={{ padding: "8px 10px" }}>{labels.colActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id} style={{ borderTop: "1px solid var(--card-border, rgba(0,0,0,.06))" }}>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatTableDate(e.occurredOn)}</td>
                          <td style={{ padding: "8px 10px" }}>{e.description}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatMoney(e.amount)}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <form action={deleteFinancialExpense} style={{ margin: 0 }}>
                              <input type="hidden" name="id" value={e.id} />
                              <button type="submit" className="btn" style={{ fontSize: 12, padding: "4px 8px" }}>
                                {labels.deleteLabel}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <p style={{ margin: "0 0 12px 0", color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)", lineHeight: 1.5 }}>
        {labels.modalsHint}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "clamp(20px, 4vw, 28px)" }}>
        <button type="button" className="btn" style={{ background: "var(--bg-secondary)" }} onClick={() => setOpen("renewals")}>
          {labels.openRenewals} ({renewalsPending.length})
        </button>
        <button type="button" className="btn" style={{ background: "var(--bg-secondary)" }} onClick={() => setOpen("payments")}>
          {labels.openPayments} ({allPaymentRows.length})
        </button>
        <button type="button" className="btn" style={{ background: "var(--bg-secondary)" }} onClick={() => setOpen("expenses")}>
          {labels.openExpenses} ({expenses.length})
        </button>
      </div>
      {mounted && createPortal(modals, document.body)}
    </>
  );
}
