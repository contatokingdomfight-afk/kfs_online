"use client";

import { useState } from "react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  includes_digital_access: boolean;
  includes_performance_tracking: boolean;
  includes_check_in: boolean;
  modality_scope: string | null;
  includes_exclusive_benefits: boolean;
  hasStripe: boolean;
};

type Props = {
  plan: Plan;
  studentId: string | null;
  locale: "pt" | "en";
  perMonth: string;
  loading: string;
  choosePlanSelect: string;
};

export function PlanCard({ plan, studentId, locale, perMonth, loading: loadingLabel, choosePlanSelect }: Props) {
  const [isLoading, setLoading] = useState(false);

  const benefits: string[] = [];
  if (plan.includes_check_in) benefits.push(locale === "pt" ? "Check-in nas aulas" : "Class check-in");
  if (plan.includes_digital_access) benefits.push(locale === "pt" ? "Acesso à biblioteca digital" : "Digital library access");
  if (plan.includes_performance_tracking) benefits.push(locale === "pt" ? "Acompanhamento de performance" : "Performance tracking");
  if (plan.modality_scope === "ALL") benefits.push(locale === "pt" ? "Todas as modalidades" : "All modalities");
  else if (plan.modality_scope === "SINGLE") benefits.push(locale === "pt" ? "Uma modalidade" : "One modality");
  if (plan.includes_exclusive_benefits) benefits.push(locale === "pt" ? "Benefícios exclusivos" : "Exclusive benefits");

  async function handleSelect() {
    if (!studentId || !plan.hasStripe) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        backgroundColor: "var(--bg-secondary, var(--bg))",
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{plan.name}</h3>
      {plan.description && (
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
          {plan.description}
        </p>
      )}
      <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
        €{plan.price_monthly.toFixed(0)}
        <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-secondary)" }}>
          {perMonth}
        </span>
      </p>
      <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
        {benefits.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      {plan.hasStripe && studentId ? (
        <button
          type="button"
          onClick={handleSelect}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ marginTop: "auto" }}
        >
          {isLoading ? loadingLabel : choosePlanSelect}
        </button>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
          {locale === "pt" ? "Contacta a secretaria para subscrever." : "Contact the office to subscribe."}
        </p>
      )}
    </div>
  );
}
