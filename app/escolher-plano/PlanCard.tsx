"use client";

import { useState, useEffect } from "react";

type PlanPriceOption = { stripePriceId: string; intervalLabel: string; amountCents: number };
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
  planPrices?: PlanPriceOption[];
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
  const [error, setError] = useState<string | null>(null);
  const priceOptions = plan.planPrices ?? [];
  const [selectedPriceId, setSelectedPriceId] = useState(priceOptions[0]?.stripePriceId ?? "");
  useEffect(() => {
    if (priceOptions.length > 0 && !selectedPriceId) {
      setSelectedPriceId(priceOptions[0].stripePriceId);
    }
  }, [priceOptions]);

  const benefits: string[] = [];
  if (plan.includes_check_in) benefits.push(locale === "pt" ? "Check-in nas aulas" : "Class check-in");
  if (plan.includes_digital_access) benefits.push(locale === "pt" ? "Acesso à biblioteca digital" : "Digital library access");
  if (plan.includes_performance_tracking) benefits.push(locale === "pt" ? "Acompanhamento de performance" : "Performance tracking");
  if (plan.modality_scope === "ALL") benefits.push(locale === "pt" ? "Todas as modalidades" : "All modalities");
  else if (plan.modality_scope === "SINGLE") benefits.push(locale === "pt" ? "Uma modalidade" : "One modality");
  if (plan.includes_exclusive_benefits) benefits.push(locale === "pt" ? "Benefícios exclusivos" : "Exclusive benefits");

  async function handleSelect() {
    if (!studentId || !plan.hasStripe) return;
    const stripePriceIdToUse = priceOptions.length > 0 ? (selectedPriceId || priceOptions[0]?.stripePriceId) : undefined;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, stripePriceId: stripePriceIdToUse }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        setError(data?.error ?? (res.status === 401 ? "Sessão expirada. Por favor, entra novamente." : "Erro ao iniciar pagamento. Tenta novamente."));
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Erro de rede. Verifica a ligação e tenta novamente.");
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
      {priceOptions.length > 1 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <select
            value={selectedPriceId}
            onChange={(e) => setSelectedPriceId(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg)",
              color: "var(--text-primary)",
              fontSize: 14,
            }}
            aria-label={locale === "pt" ? "Periodicidade" : "Billing interval"}
          >
            {priceOptions.map((po) => (
              <option key={po.stripePriceId} value={po.stripePriceId}>
                {po.intervalLabel} · €{(po.amountCents / 100).toFixed(0)}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
            {locale === "pt" ? "Cobrança automática recorrente. Sem preocupações." : "Automatic recurring billing. No hassle."}
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          €{plan.price_monthly.toFixed(0)}
          <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-secondary)" }}>
            {perMonth}
          </span>
        </p>
      )}
      <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
        {benefits.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      {error && (
        <p style={{ fontSize: 13, color: "var(--text-error, #dc2626)", margin: 0 }} role="alert">
          {error}
        </p>
      )}
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
