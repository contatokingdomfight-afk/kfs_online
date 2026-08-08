"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RenewalsSection } from "../RenewalsSection";
import { AddExpenseForm } from "./AddExpenseForm";
import { AddManualRevenueForm } from "./AddManualRevenueForm";
import { CashDepositForm } from "./CashDepositForm";
import { CashDepositRecentList } from "./CashDepositRecentList";
import { dedupeDuplicatePaymentsAction } from "../actions";
import { EditExpenseForm } from "./EditExpenseForm";
import { EditPaymentForm } from "./EditPaymentForm";
import { ExpenseList } from "./ExpenseList";
import { PaymentRecordActions } from "./PaymentRecordActions";
import { RevenueBreakdownList, type RevenueBreakdownListRow } from "./RevenueBreakdownList";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { VoidLateTuitionForm } from "@/components/admin/VoidLateTuitionForm";
import type { RenewalPending } from "@/lib/renewals";
import type { FinancialExpenseRow } from "@/lib/admin-finance-overview";
import type { CashDepositRow } from "@/lib/cash-balance";
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

type ModalId = "renewals" | "payments" | "expenses" | "revenue" | "cashDeposit";

export type RevenueModalRow = RevenueBreakdownListRow;

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
  formPaymentMethod: string;
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
  colCategory: string;
  colPaymentMethod: string;
  colAmount: string;
  colActions: string;
  noExpenses: string;
  noExpensesFilter: string;
  expenseFilterSearch: string;
  expenseFilterDateFrom: string;
  expenseFilterDateTo: string;
  expenseFilterAmountMin: string;
  expenseFilterAmountMax: string;
  expenseFilterClear: string;
  formAmount: string;
  formDescription: string;
  formDate: string;
  formKindField: string;
  formKindFixed: string;
  formKindVariable: string;
  formCategory: string;
  formPaymentMethod: string;
  formSubmit: string;
  expenseSaved: string;
  editExpenseTitle: string;
  editExpenseAction: string;
  editExpenseSubmit: string;
  deleteLabel: string;
  deletingExpenseLabel: string;
  expenseErrorSuffix: string;
  openRenewals: string;
  openPayments: string;
  openExpenses: string;
  openRevenue: string;
  openCashDeposits: string;
  cashDepositTitle: string;
  cashDepositRecentTitle: string;
  cashDepositAmount: string;
  cashDepositDate: string;
  cashDepositDescription: string;
  cashDepositSubmit: string;
  cashDepositSaved: string;
  cashDepositPhysicalHint: string;
  deletingDepositLabel: string;
  /** Botão por linha «Em atraso» → registo de pagamento (admin). */
  registerPaymentCta: string;
  voidLateTuitionCta: string;
  voidLateTuitionHint: string;
  onboardingBundleLabel: string;
  familyTuitionLabel: string;
  editPaymentTitle: string;
  editPaymentAction: string;
  editPaymentSubmit: string;
  editPaymentStatus: string;
  deletePaymentConfirm: string;
  deletePaymentBundleConfirm: string;
  deletingPaymentLabel: string;
  paymentErrorFromUrl?: string | null;
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
  physicalCashOnHand: number;
  treasuryError: string | null;
  recentCashDeposits: CashDepositRow[];
  depositErrorFromUrl: string | null;
  defaultCashDepositDate: string;
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

function ModalCloseButton({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        flexShrink: 0,
        width: 40,
        height: 40,
        minWidth: 40,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        lineHeight: 1,
        borderRadius: 8,
      }}
    >
      ×
    </button>
  );
}

function ModalHeader({
  titleId,
  title,
  onClose,
  closeLabel,
  tip,
  marginBottom = 12,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  closeLabel: string;
  tip?: { detail: string; ariaLabel: string };
  marginBottom?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        marginBottom,
        flexShrink: 0,
      }}
    >
      <h2
        id={titleId}
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          flex: 1,
          minWidth: 0,
          lineHeight: 1.35,
        }}
      >
        {title}
      </h2>
      {tip ? <InlineInfoTip detail={tip.detail} ariaLabel={tip.ariaLabel} className="mt-0.5" /> : null}
      <ModalCloseButton onClick={onClose} ariaLabel={closeLabel} />
    </div>
  );
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
  physicalCashOnHand,
  treasuryError,
  recentCashDeposits,
  depositErrorFromUrl,
  defaultCashDepositDate,
  labels,
  locale,
}: Props) {
  const [open, setOpen] = useState<ModalId | null>(null);
  const [mounted, setMounted] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "PAID" | "LATE">("all");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const titleId = useId();
  const monthLabelShort = `${referenceMonth.slice(5)}/${referenceMonth.slice(0, 4)}`;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (depositErrorFromUrl) setOpen("cashDeposit");
  }, [depositErrorFromUrl]);

  useEffect(() => {
    if (labels.paymentErrorFromUrl) setOpen("payments");
  }, [labels.paymentErrorFromUrl]);

  const closeModal = useCallback(() => {
    setOpen(null);
    setEditingExpenseId(null);
    setEditingPaymentId(null);
  }, []);

  const closeEditExpense = useCallback(() => setEditingExpenseId(null), []);
  const closeEditPayment = useCallback(() => setEditingPaymentId(null), []);

  const editingExpense = useMemo(
    () => (editingExpenseId ? expenses.find((e) => e.id === editingExpenseId) ?? null : null),
    [editingExpenseId, expenses]
  );

  const editingPayment = useMemo(
    () => (editingPaymentId ? allPaymentRows.find((p) => p.id === editingPaymentId) ?? null : null),
    [editingPaymentId, allPaymentRows]
  );

  useEffect(() => {
    if (!open && !editingExpenseId && !editingPaymentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editingPaymentId) closeEditPayment();
      else if (editingExpenseId) closeEditExpense();
      else closeModal();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, editingExpenseId, editingPaymentId, closeModal, closeEditExpense, closeEditPayment]);

  const displayPaymentRows = useMemo(
    () => groupPaymentListRows(allPaymentRows),
    [allPaymentRows]
  );

  const filteredPayments = useMemo(() => {
    if (filterStatus === "all") return displayPaymentRows;
    return displayPaymentRows.filter((p) => p.status === filterStatus);
  }, [displayPaymentRows, filterStatus]);

  /** Soma dos pagamentos PAID por aluno, entre os registos visíveis nesta lista (últimos 200). */
  const totalPaidByStudent = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of allPaymentRows) {
      if (row.status !== "PAID") continue;
      map.set(row.studentId, (map.get(row.studentId) ?? 0) + row.amount);
    }
    return map;
  }, [allPaymentRows]);

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
            <ModalHeader
              titleId={titleId + "-r"}
              title={`${labels.openRenewals} (${monthLabelShort})`}
              onClose={closeModal}
              closeLabel={labels.close}
              marginBottom={8}
            />
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
            <ModalHeader
              titleId={titleId + "-p"}
              title={labels.paymentsModalTitle}
              onClose={closeModal}
              closeLabel={labels.close}
            />
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
            {labels.paymentErrorFromUrl && (
              <p role="alert" className="card" style={{ padding: 10, color: "var(--error)", marginBottom: 10, fontSize: 13 }}>
                {decodeURIComponent(labels.paymentErrorFromUrl.replace(/\+/g, " "))}
              </p>
            )}
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
                          <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                            Total pago pelo aluno: {(totalPaidByStudent.get(p.studentId) ?? 0).toFixed(2)} €
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
                          <PaymentRecordActions
                            paymentIds={p.paymentIds}
                            deleteLabel={labels.deleteLabel}
                            deletingLabel={labels.deletingPaymentLabel}
                            deleteConfirm={labels.deletePaymentBundleConfirm}
                          />
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
                            ? labels.familyTuitionLabel
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
                      <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                        Total pago pelo aluno: {(totalPaidByStudent.get(row.studentId) ?? 0).toFixed(2)} €
                      </p>
                      {row.status === "LATE" && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
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
                          {row.paymentType === "TUITION" && row.referenceMonth ? (
                            <VoidLateTuitionForm
                              studentId={row.studentId}
                              referenceMonth={row.referenceMonth}
                              buttonLabel={labels.voidLateTuitionCta}
                              hint={labels.voidLateTuitionHint}
                            />
                          ) : null}
                        </div>
                      )}
                      <PaymentRecordActions
                        paymentIds={[row.id]}
                        deleteLabel={labels.deleteLabel}
                        deletingLabel={labels.deletingPaymentLabel}
                        deleteConfirm={labels.deletePaymentConfirm}
                        editLabel={labels.editPaymentAction}
                        onEdit={() => setEditingPaymentId(row.id)}
                      />
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
            <ModalHeader
              titleId={titleId + "-e"}
              title={labels.expensesTitle}
              onClose={closeModal}
              closeLabel={labels.close}
            />
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
                  categoryField: labels.formCategory,
                  paymentMethod: labels.formPaymentMethod,
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
                <ExpenseList
                  expenses={expenses}
                  locale={locale}
                  labels={{
                    formKindFixed: labels.formKindFixed,
                    formKindVariable: labels.formKindVariable,
                    editExpenseAction: labels.editExpenseAction,
                    deleteLabel: labels.deleteLabel,
                    deletingExpenseLabel: labels.deletingExpenseLabel,
                    filterSearch: labels.expenseFilterSearch,
                    filterDateFrom: labels.expenseFilterDateFrom,
                    filterDateTo: labels.expenseFilterDateTo,
                    filterAmountMin: labels.expenseFilterAmountMin,
                    filterAmountMax: labels.expenseFilterAmountMax,
                    filterClear: labels.expenseFilterClear,
                    noExpensesFilter: labels.noExpensesFilter,
                  }}
                  onEdit={setEditingExpenseId}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {editingPayment && (
        <div
          style={{ ...overlayStyle, zIndex: 10001 }}
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeEditPayment()}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId + "-edit-payment"}
            onClick={(e) => e.stopPropagation()}
            style={modalCardStyle(520)}
          >
            <ModalHeader
              titleId={titleId + "-edit-payment"}
              title={labels.editPaymentTitle}
              onClose={closeEditPayment}
              closeLabel={labels.close}
              marginBottom={16}
            />
            <EditPaymentForm
              key={editingPayment.id}
              payment={editingPayment}
              onDone={closeEditPayment}
              onCancel={closeEditPayment}
              labels={{
                amount: labels.formAmount,
                status: labels.editPaymentStatus,
                statusPaid: labels.statusPaid,
                statusLate: labels.statusLate,
                paymentMethod: labels.formPaymentMethod,
                submit: labels.editPaymentSubmit,
                cancel: labels.close,
              }}
            />
          </div>
        </div>
      )}

      {editingExpense && (
        <div
          style={{ ...overlayStyle, zIndex: 10001 }}
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeEditExpense()}
        >
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId + "-edit-expense"}
            onClick={(e) => e.stopPropagation()}
            style={modalCardStyle(520)}
          >
            <ModalHeader
              titleId={titleId + "-edit-expense"}
              title={labels.editExpenseTitle}
              onClose={closeEditExpense}
              closeLabel={labels.close}
              marginBottom={16}
            />
            <EditExpenseForm
              key={editingExpense.id}
              expense={editingExpense}
              onDone={closeEditExpense}
              onCancel={closeEditExpense}
              labels={{
                amount: labels.formAmount,
                description: labels.formDescription,
                date: labels.formDate,
                kindField: labels.formKindField,
                kindFixed: labels.formKindFixed,
                kindVariable: labels.formKindVariable,
                categoryField: labels.formCategory,
                paymentMethod: labels.formPaymentMethod,
                submit: labels.editExpenseSubmit,
                cancel: labels.close,
              }}
            />
          </div>
        </div>
      )}

      {open === "cashDeposit" && (
        <div style={overlayStyle} role="presentation" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div
            className="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId + "-cd"}
            onClick={(e) => e.stopPropagation()}
            style={modalCardStyle(560)}
          >
            <ModalHeader
              titleId={titleId + "-cd"}
              title={labels.cashDepositTitle}
              onClose={closeModal}
              closeLabel={labels.close}
            />
            {depositErrorFromUrl && (
              <p role="alert" className="card" style={{ padding: 10, color: "var(--error)", marginBottom: 10, fontSize: 13 }}>
                {decodeURIComponent(depositErrorFromUrl.replace(/\+/g, " "))}
              </p>
            )}
            {treasuryError && (
              <p role="alert" style={{ color: "var(--error)", fontSize: 13, margin: "0 0 12px 0" }}>
                {treasuryError}
              </p>
            )}
            <div style={{ overflow: "auto", minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <CashDepositForm
                defaultDate={defaultCashDepositDate}
                physicalCashOnHand={physicalCashOnHand}
                labels={{
                  amount: labels.cashDepositAmount,
                  date: labels.cashDepositDate,
                  description: labels.cashDepositDescription,
                  submit: labels.cashDepositSubmit,
                  success: labels.cashDepositSaved,
                  physicalCashHint: labels.cashDepositPhysicalHint,
                }}
              />
              {recentCashDeposits.length > 0 ? (
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                    {labels.cashDepositRecentTitle}
                  </h3>
                  <CashDepositRecentList
                    deposits={recentCashDeposits.slice(0, 8)}
                    locale={locale}
                    deleteLabel={labels.deleteLabel}
                    deletingLabel={labels.deletingDepositLabel}
                  />
                </div>
              ) : null}
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
            <ModalHeader
              titleId={titleId + "-v"}
              title={revenue.modalTitle}
              onClose={closeModal}
              closeLabel={labels.close}
              tip={{ detail: revenue.sectionHint, ariaLabel: revenue.sectionHintAria }}
            />
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
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div style={{ minWidth: 0 }}>
                {!revenue.error && revenue.rows.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)" }}>{revenue.noRows}</p>
                ) : !revenue.error ? (
                  <RevenueBreakdownList
                    rows={revenue.rows}
                    total={revenue.total}
                    totalLabel={revenue.totalLabel}
                    deleteLabel={labels.deleteLabel}
                    locale={locale}
                  />
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
                    paymentMethod: revenue.formPaymentMethod,
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
      {treasuryError ? (
        <p role="alert" style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>
          {treasuryError}
        </p>
      ) : null}
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
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%", gridColumn: "1 / -1" }}
          onClick={() => setOpen("cashDeposit")}
        >
          {labels.openCashDeposits} ({recentCashDeposits.length})
        </button>
      </div>
      {mounted && createPortal(modals, document.body)}
    </>
  );
}
