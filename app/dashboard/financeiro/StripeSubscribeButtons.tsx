"use client";

import { useState, useEffect } from "react";

type PlanPriceOption = { stripePriceId: string; intervalLabel: string; amountCents: number };
type PlanOption = { id: string; name: string; price_monthly: number; stripePriceId?: string; planPrices?: PlanPriceOption[] };

type Props = {
  hasStripeCustomer: boolean;
  plansWithStripe: PlanOption[];
  subscribeLabel?: string;
  manageLabel?: string;
  perMonthLabel?: string;
};

export function StripeSubscribeButtons({
  hasStripeCustomer,
  plansWithStripe,
  subscribeLabel = "Subscrever com cartão",
  manageLabel = "Gerir assinatura / cartão",
  perMonthLabel = "/mês",
}: Props) {
  const firstPlan = plansWithStripe[0];
  const firstPrice = firstPlan?.planPrices?.[0] ?? (firstPlan?.stripePriceId ? { stripePriceId: firstPlan.stripePriceId, intervalLabel: perMonthLabel, amountCents: Math.round((firstPlan.price_monthly ?? 0) * 100) } : null);
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [planId, setPlanId] = useState(firstPlan?.id ?? "");
  const [stripePriceId, setStripePriceId] = useState(firstPrice?.stripePriceId ?? "");
  const [error, setError] = useState<string | null>(null);

  const currentPlan = plansWithStripe.find((p) => p.id === planId);
  const priceOptions = currentPlan?.planPrices ?? (currentPlan?.stripePriceId ? [{ stripePriceId: currentPlan.stripePriceId, intervalLabel: perMonthLabel, amountCents: Math.round((currentPlan.price_monthly ?? 0) * 100) }] : []);

  useEffect(() => {
    const p = plansWithStripe.find((x) => x.id === planId);
    const first = p?.planPrices?.[0] ?? (p?.stripePriceId ? { stripePriceId: p.stripePriceId } : null);
    if (first) setStripePriceId(first.stripePriceId);
  }, [planId, plansWithStripe]);

  const handleCheckout = async () => {
    if (!planId || !stripePriceId) {
      setError("Escolhe um plano e opção de pagamento.");
      return;
    }
    setLoading("checkout");
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, stripePriceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar sessão.");
        setLoading(null);
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError("Resposta inválida.");
    } catch {
      setError("Erro de rede.");
    }
    setLoading(null);
  };

  const handlePortal = async () => {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao abrir portal.");
        setLoading(null);
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError("Resposta inválida.");
    } catch {
      setError("Erro de rede.");
    }
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {hasStripeCustomer && (
        <button
          type="button"
          onClick={handlePortal}
          disabled={!!loading}
          className="btn btn-secondary w-full sm:w-auto"
        >
          {loading === "portal" ? "A abrir…" : manageLabel}
        </button>
      )}
      {plansWithStripe.length > 0 && (
        <div className="flex flex-col gap-2">
          {plansWithStripe.length > 1 && (
            <select
              value={planId}
              onChange={(e) => {
                const p = plansWithStripe.find((x) => x.id === e.target.value);
                setPlanId(e.target.value);
                const first = p?.planPrices?.[0] ?? (p?.stripePriceId ? { stripePriceId: p.stripePriceId } : null);
                if (first) setStripePriceId(first.stripePriceId);
              }}
              className="input w-full max-w-xs"
              aria-label="Escolher plano"
            >
              {plansWithStripe.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {priceOptions.length > 1 && (
            <select
              value={stripePriceId}
              onChange={(e) => setStripePriceId(e.target.value)}
              className="input w-full max-w-xs"
              aria-label="Periodicidade"
            >
              {priceOptions.map((po) => (
                <option key={po.stripePriceId} value={po.stripePriceId}>
                  {po.intervalLabel} · €{(po.amountCents / 100).toFixed(0)}
                </option>
              ))}
            </select>
          )}
          {priceOptions.length === 1 && (
            <p className="text-sm text-text-secondary">
              {currentPlan?.name} · €{(priceOptions[0]?.amountCents ?? 0) / 100} {priceOptions[0]?.intervalLabel ?? perMonthLabel}
            </p>
          )}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!!loading}
            className="btn btn-primary w-full sm:w-auto"
          >
            {loading === "checkout" ? "A redirecionar…" : subscribeLabel}
          </button>
        </div>
      )}
    </div>
  );
}
