"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import type { PendingPayment, PendingTrial, LowAttendanceLesson } from "@/lib/admin-action-items";
import { AcceptTrialButton } from "../experimentais/AcceptTrialButton";
import { ConvertTrialButton } from "../experimentais/ConvertTrialButton";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";
import { RegisterPendingPaymentModal } from "../financeiro/_components/RegisterPendingPaymentModal";

function pendingPaymentPeriodLabel(p: PendingPayment): string {
  if (p.paymentType === "ENROLLMENT") return "Matrícula";
  if (p.paymentType === "INSURANCE") return p.referenceYear ? `Seguro ${p.referenceYear}` : "Seguro";
  return p.referenceMonth || "—";
}

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

type Props = {
  pendingPayments: PendingPayment[];
  pendingTrials: PendingTrial[];
  lowAttendanceLessons: LowAttendanceLesson[];
  labels: {
    title: string;
    tabPayments: string;
    tabTrials: string;
    tabLowAttendance: string;
    managePayment: string;
    viewLesson: string;
    emptyPayments: string;
    emptyTrials: string;
    emptyLowAttendance: string;
    closeModal: string;
    cardHint: string;
  };
};

type Tab = "payments" | "trials" | "low";

export function ActionItems({
  pendingPayments,
  pendingTrials,
  lowAttendanceLessons,
  labels,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("payments");
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const openForTab = (t: Tab) => {
    setTab(t);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen, closeModal]);

  const tabs = [
    { id: "payments" as Tab, label: labels.tabPayments, count: pendingPayments.length },
    { id: "trials" as Tab, label: labels.tabTrials, count: pendingTrials.length },
    { id: "low" as Tab, label: labels.tabLowAttendance, count: lowAttendanceLessons.length },
  ];

  const tabPanel = (
    <>
      {tab === "payments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {pendingPayments.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)", margin: 0 }}>
              {labels.emptyPayments}
            </p>
          ) : (
            pendingPayments.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                  padding: "clamp(12px, 3vw, 14px)",
                  backgroundColor: "var(--bg)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.studentName}</span>
                  <span style={{ marginLeft: 8, color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
                    {p.paymentTypeLabel} · {Number(p.amount).toFixed(2)} € · {pendingPaymentPeriodLabel(p)}
                  </span>
                </div>
                <RegisterPendingPaymentModal
                  paymentId={p.id}
                  studentName={p.studentName}
                  paymentTypeLabel={p.paymentTypeLabel}
                  periodLabel={pendingPaymentPeriodLabel(p)}
                  amount={p.amount}
                  familyDiscountPercent={p.familyDiscountPercent}
                  buttonLabel={labels.managePayment}
                  buttonClassName="btn btn-primary"
                />
              </div>
            ))
          )}
        </div>
      )}

      {tab === "trials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {pendingTrials.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)", margin: 0 }}>
              {labels.emptyTrials}
            </p>
          ) : (
            pendingTrials.map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "clamp(12px, 3vw, 14px)",
                  backgroundColor: "var(--bg)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</div>
                <div style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", marginTop: 4 }}>
                  {MODALITY_LABELS[t.modality] ?? t.modality} · {formatLessonDate(t.lessonDate)}
                </div>
                <div style={{ marginTop: "clamp(8px, 2vw, 12px)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <AcceptTrialButton trialId={t.id} />
                  {t.contact.includes("@") && <ConvertTrialButton trialId={t.id} />}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "low" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {lowAttendanceLessons.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)", margin: 0 }}>
              {labels.emptyLowAttendance}
            </p>
          ) : (
            lowAttendanceLessons.map((l) => (
              <Link
                key={l.id}
                href={`/admin/turmas/${l.id}`}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                  padding: "clamp(12px, 3vw, 14px)",
                  backgroundColor: "var(--bg)",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {MODALITY_LABELS[l.modality] ?? l.modality}
                  </span>
                  <span style={{ marginLeft: 8, color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
                    {formatLessonDate(l.date)} · {l.startTime}–{l.endTime} · {l.confirmedCount + l.pendingCount} intenções
                  </span>
                </div>
                <span style={{ color: "var(--primary)", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 500 }}>
                  {labels.viewLesson} →
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </>
  );

  return (
    <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)", minWidth: 0 }}>
      <h2
        style={{
          margin: "0 0 clamp(8px, 2vw, 10px) 0",
          fontSize: "clamp(18px, 4.5vw, 20px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {labels.title}
      </h2>
      <p
        style={{
          margin: "0 0 clamp(16px, 4vw, 20px) 0",
          color: "var(--text-secondary)",
          fontSize: "clamp(13px, 3.2vw, 15px)",
          lineHeight: 1.45,
        }}
      >
        {labels.cardHint}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => openForTab(t.id)}
            className="btn"
            style={{
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: "clamp(13px, 3.2vw, 15px)",
              padding: "10px 16px",
              textAlign: "left",
            }}
            aria-label={`${t.label} — ${t.count}`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {mounted && modalOpen
        ? createPortal(
            <div style={overlayStyle} role="presentation" onClick={(e) => e.target === e.currentTarget && closeModal()}>
              <div
                className="card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: 640,
                  width: "100%",
                  maxHeight: "min(85vh, 700px)",
                  display: "flex",
                  flexDirection: "column",
                  padding: "clamp(20px, 4vw, 24px)",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <h2 id={titleId} style={{ margin: 0, fontSize: "clamp(17px, 4.2vw, 20px)", fontWeight: 600 }}>
                    {labels.title}
                  </h2>
                  <button type="button" className="button" onClick={closeModal} style={{ minWidth: 88, flexShrink: 0 }}>
                    {labels.closeModal}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "clamp(14px, 3.5vw, 18px)" }}>
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className="btn"
                      style={{
                        backgroundColor: tab === t.id ? "var(--primary)" : "var(--bg-secondary)",
                        color: tab === t.id ? "#fff" : "var(--text-primary)",
                        fontSize: "clamp(12px, 3vw, 14px)",
                        padding: "8px 12px",
                      }}
                    >
                      {t.label} ({t.count})
                    </button>
                  ))}
                </div>
                <div style={{ overflow: "auto", minHeight: 0, paddingRight: 2 }}>{tabPanel}</div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
