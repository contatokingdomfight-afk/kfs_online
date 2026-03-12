"use client";

import { useState } from "react";
import Link from "next/link";
import type { PendingPayment, PendingTrial, LowAttendanceLesson } from "@/lib/admin-action-items";
import { AcceptTrialButton } from "../experimentais/AcceptTrialButton";
import { ConvertTrialButton } from "../experimentais/ConvertTrialButton";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";

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
  };
};

type Tab = "payments" | "trials" | "low";

export function ActionItems({
  pendingPayments,
  pendingTrials,
  lowAttendanceLessons,
  labels,
}: Props) {
  const [tab, setTab] = useState<Tab>("payments");

  const tabs = [
    { id: "payments" as Tab, label: labels.tabPayments, count: pendingPayments.length },
    { id: "trials" as Tab, label: labels.tabTrials, count: pendingTrials.length },
    { id: "low" as Tab, label: labels.tabLowAttendance, count: lowAttendanceLessons.length },
  ];

  return (
    <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)", minWidth: 0 }}>
      <h2
        style={{
          margin: "0 0 clamp(16px, 4vw, 20px) 0",
          fontSize: "clamp(18px, 4.5vw, 20px)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {labels.title}
      </h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "clamp(16px, 4vw, 20px)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="btn"
            style={{
              backgroundColor: tab === t.id ? "var(--primary)" : "var(--bg-secondary)",
              color: tab === t.id ? "#fff" : "var(--text-primary)",
              fontSize: "clamp(13px, 3.2vw, 15px)",
              padding: "8px 14px",
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === "payments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {pendingPayments.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
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
                    {Number(p.amount).toFixed(0)} € · {p.referenceMonth}
                  </span>
                </div>
                <Link
                  href={`/admin/financeiro/novo?studentId=${p.studentId}&referenceMonth=${p.referenceMonth}&amount=${p.amount}`}
                  className="btn btn-primary"
                  style={{ fontSize: "clamp(13px, 3.2vw, 15px)", textDecoration: "none", padding: "8px 14px" }}
                >
                  {labels.managePayment}
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "trials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {pendingTrials.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
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
            <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
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
    </section>
  );
}
