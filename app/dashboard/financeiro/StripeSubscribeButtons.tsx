"use client";

import { useState } from "react";

type PlanOption = { id: string; name: string; price_monthly: number };

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
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [planId, setPlanId] = useState(plansWithStripe[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!planId) {
      setError("Escolhe um plano.");
      return;
    }
    setLoading("checkout");
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
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
              onChange={(e) => setPlanId(e.target.value)}
              className="input w-full max-w-xs"
              aria-label="Escolher plano"
            >
              {plansWithStripe.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · €{p.price_monthly.toFixed(0)}{perMonthLabel}
                </option>
              ))}
            </select>
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
