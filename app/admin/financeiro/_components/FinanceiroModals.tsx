"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RenewalsSection } from "../RenewalsSection";
import { AddExpenseForm } from "./AddExpenseForm";
import { AddManualRevenueForm } from "./AddManualRevenueForm";
import { dedupeDuplicatePaymentsAction, deleteFinancialExpense, deleteManualRevenue } from "../actions";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import type { RenewalPending } from "@/lib/renewals";
import type { FinancialExpenseRow } from "@/lib/admin-finance-overview";
import {
  groupPaymentListRows,
  isOnboardingBundleRow,
  type PaymentListDisplayRow,
  type PaymentListRow,
} from "@/lib/admin-payment-list-grouping";

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

export type { PaymentListRow } from "@/lib/admin-payment-list-grouping";

type ModalId = "renewals" | "payments" | "expenses" | "revenue";

export type RevenueModalRow = {
  key: string;
  displayLabel: string;
  amount: number;
  isManual: boolean;
};

export type RevenueModalData = {
  error: string | null;
  errorHint: string;
  modalTitle: string;
  sectionHint: string;
  sectionHintAria: string;
  tableFront: string;
  tableAmount: string;
  tableActions: string;
  noRows: string;
  totalLabel: string;
  addBlockTitle: string;
  formAmount: string;
  formDescription: string;
  formDate: string;
  formSubmit: string;
  formSuccess: string;
  rows: RevenueModalRow[];
  total: number;
};

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
  colKind: string;
  colAmount: string;
  colActions: string;
  noExpenses: string;
  formAmount: string;
  formDescription: string;
  formDate: string;
  formKindField: string;
  formKindFixed: string;
  formKindVariable: string;
  formSubmit: string;
  expenseSaved: string;
  deleteLabel: string;
  expenseErrorSuffix: string;
  openRenewals: string;
  openPayments: string;
  openExpenses: string;
  openRevenue: string;
  /** Botão por linha «Em atraso» → registo de pagamento (admin). */
  registerPaymentCta: string;
  onboardingBundleLabel: string;
  familyTuitionLabel: string;
};

type Props = {
  referenceMonth: string;
  renewalsPending: RenewalPending[];
  paymentRows: PaymentListRow[];
  expenses: FinancialExpenseRow[];
  expensesError: string | null;
  expenseErrorFromUrl: string | null;
  defaultExpenseDate: string;
  /** Apenas serializável (sem funções do servidor). */
  locale: "pt" | "en";
  labels: Labels;
  revenue: RevenueModalData;
  revenueErrorFromUrl: string | null;
  defaultManualRevenueDate: string;
};

function formatMoneyN(n: number, locale: "pt" | "en") {
  return n.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatTableDate(yyyyMmDd: string, locale: "pt" | "en") {
  const d = new Date(yyyyMmDd + "T12:00:00Z");
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
  revenue,
  revenueErrorFromUrl,
  defaultManualRevenueDate,
  labels,
  locale,
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

  const displayPaymentRows = useMemo(
    () => groupPaymentListRows(allPaymentRows),
    [allPaymentRows]
  );

  const filteredPayments = useMemo(() => {
    if (filterStatus === "all") return displayPaymentRows;
    return displayPaymentRows.filter((p) => p.status === filterStatus);
  }, [displayPaymentRows, filterStatus]);

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
                  {displayPaymentRows.length === 0 ? labels.noPayments : labels.noPaymentsFilter}
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
                  {filteredPayments.map((p) => {
                    if (isOnboardingBundleRow(p)) {
                      const registerHref = `/admin/financeiro/primeiro-pagamento?studentId=${encodeURIComponent(p.studentId)}${p.referenceMonth ? `&referenceMonth=${encodeURIComponent(p.referenceMonth)}` : ""}`;
                      const isLate = p.status === "LATE";
                      return (
                        <li key={p.id} className="card" style={{ padding: 12 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.displayName}</span>
                            <span
                              style={{
                                fontSize: 12,
                                padding: "2px 8px",
                                borderRadius: "var(--radius-md)",
                                backgroundColor: isLate ? "var(--danger)" : "var(--success)",
                                color: "#fff",
                              }}
                            >
                              {isLate ? labels.statusLate : labels.statusPaid}
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
                            {labels.onboardingBundleLabel} · {p.amount.toFixed(2)} €
                          </p>
                          {isLate && (
                            <div style={{ marginTop: 10 }}>
                              <Link
                                href={registerHref}
                                className="btn btn-primary"
                                style={{
                                  display: "inline-flex",
                                  width: "100%",
                                  justifyContent: "center",
                                  textDecoration: "none",
                                  fontSize: 14,
                                }}
                                onClick={closeModal}
                              >
                                {labels.registerPaymentCta}
                              </Link>
                            </div>
                          )}
                        </li>
                      );
                    }

                    const row = p;
                    const registerParams = new URLSearchParams({
                      studentId: row.studentId,
                      amount: row.amount.toFixed(2),
                    });
                    if (row.paymentType === "INSURANCE" && row.referenceYear) {
                      registerParams.set("referenceYear", row.referenceYear);
                    } else if (row.referenceMonth) {
                      registerParams.set("referenceMonth", row.referenceMonth);
                    }
                    const registerHref = `/admin/financeiro/novo?${registerParams.toString()}`;
                    const periodLabel =
                      row.paymentType === "INSURANCE"
                        ? `Seguro ${row.referenceYear ?? "—"}`
                        : row.paymentType === "ENROLLMENT"
                          ? "Matrícula"
                          : row.familyGroupId
                            ? `${labels.familyTuitionLabel}${row.familyMemberCount ? ` (${row.familyMemberCount} membros)` : ""}`
                            : (row.referenceMonth ?? "—");
                    return (
                    <li key={row.id} className="card" style={{ padding: 12 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.displayName}</span>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: row.status === "PAID" ? "var(--success)" : "var(--danger)",
                            color: "#fff",
                          }}
                        >
                          {row.status === "PAID" ? labels.statusPaid : labels.statusLate}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
                        {periodLabel} · {row.amount.toFixed(2)} €
                      </p>
                      {row.status === "LATE" && (
                        <div style={{ marginTop: 10 }}>
                          <Link
                            href={registerHref}
                            className="btn btn-primary"
                            style={{
                              display: "inline-flex",
                              width: "100%",
                              justifyContent: "center",
                              textDecoration: "none",
                              fontSize: 14,
                            }}
                            onClick={closeModal}
                          >
                            {labels.registerPaymentCta}
                          </Link>
                        </div>
                      )}
                    </li>
                    );
                  })}
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
                  kindField: labels.formKindField,
                  kindFixed: labels.formKindFixed,
                  kindVariable: labels.formKindVariable,
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
                        <th style={{ padding: "8px 10px" }}>{labels.colKind}</th>
                        <th style={{ padding: "8px 10px" }}>{labels.colAmount}</th>
                        <th style={{ padding: "8px 10px" }}>{labels.colActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id} style={{ borderTop: "1px solid var(--card-border, rgba(0,0,0,.06))" }}>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatTableDate(e.occurredOn, locale)}</td>
                          <td style={{ padding: "8px 10px" }}>{e.description}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                            {e.kind === "FIXED" ? labels.formKindFixed : labels.formKindVariable}
                          </td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatMoneyN(e.amount, locale)}</td>
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

      {open === "revenue" && (
        <div style={overlayStyle} role="presentation" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId + "-v"}
            onClick={(e) => e.stopPropagation()}
            style={modalCardStyle(900)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 10px", minWidth: 0 }}>
                <h2 id={titleId + "-v"} style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  {revenue.modalTitle}
                </h2>
                <InlineInfoTip detail={revenue.sectionHint} ariaLabel={revenue.sectionHintAria} />
              </div>
              <button type="button" className="button" onClick={closeModal} style={{ flexShrink: 0 }}>
                {labels.close}
              </button>
            </div>
            {revenueErrorFromUrl && (
              <p role="alert" className="card" style={{ padding: 10, color: "var(--error)", marginBottom: 10, fontSize: 13 }}>
                {decodeURIComponent(revenueErrorFromUrl.replace(/\+/g, " "))}
              </p>
            )}
            {revenue.error && (
              <p role="alert" className="card" style={{ padding: 10, color: "var(--error)", marginBottom: 10, fontSize: 13 }}>
                {revenue.error} {revenue.errorHint}
              </p>
            )}

            <div
              style={{
                overflow: "auto",
                minHeight: 0,
                flex: 1,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: 20,
                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                {!revenue.error && revenue.rows.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)" }}>{revenue.noRows}</p>
                ) : !revenue.error ? (
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
                          <th style={{ padding: "8px 10px" }}>{revenue.tableFront}</th>
                          <th style={{ padding: "8px 10px" }}>{revenue.tableAmount}</th>
                          <th style={{ padding: "8px 10px" }}>{revenue.tableActions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenue.rows.map((row) => (
                          <tr key={row.key} style={{ borderTop: "1px solid var(--card-border, rgba(0,0,0,.06))" }}>
                            <td style={{ padding: "8px 10px" }}>{row.displayLabel}</td>
                            <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatMoneyN(row.amount, locale)}</td>
                            <td style={{ padding: "8px 10px" }}>
                              {row.isManual ? (
                                <form action={deleteManualRevenue} style={{ margin: 0 }}>
                                  <input type="hidden" name="id" value={row.key.replace(/^manual:/, "")} />
                                  <button type="submit" className="btn" style={{ fontSize: 12, padding: "4px 8px" }}>
                                    {labels.deleteLabel}
                                  </button>
                                </form>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {revenue.rows.length > 0 && (
                        <tfoot>
                          <tr style={{ background: "var(--bg-secondary)", fontWeight: 600 }}>
                            <td style={{ padding: "8px 10px" }}>{revenue.totalLabel}</td>
                            <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{formatMoneyN(revenue.total, locale)}</td>
                            <td style={{ padding: "8px 10px" }} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                ) : null}
              </div>

              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{revenue.addBlockTitle}</h3>
                <AddManualRevenueForm
                  defaultDate={defaultManualRevenueDate}
                  labels={{
                    amount: revenue.formAmount,
                    description: revenue.formDescription,
                    date: revenue.formDate,
                    submit: revenue.formSubmit,
                    success: revenue.formSuccess,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <p
        style={{
          margin: "0 0 14px 0",
          color: "var(--text-secondary)",
          fontSize: "clamp(13px, 3.2vw, 15px)",
          lineHeight: 1.5,
        }}
      >
        {labels.modalsHint}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
          width: "100%",
          maxWidth: "100%",
          marginBottom: "clamp(20px, 4vw, 28px)",
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%" }}
          onClick={() => setOpen("renewals")}
        >
          {labels.openRenewals} ({renewalsPending.length})
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%" }}
          onClick={() => setOpen("payments")}
        >
          {labels.openPayments} ({displayPaymentRows.length})
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%" }}
          onClick={() => setOpen("expenses")}
        >
          {labels.openExpenses} ({expenses.length})
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%" }}
          onClick={() => setOpen("revenue")}
        >
          {labels.openRevenue} ({revenue.rows.length})
        </button>
      </div>
      {mounted && createPortal(modals, document.body)}
    </>
  );
}
