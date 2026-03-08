"use client";

import { useEffect, useRef, useTransition } from "react";
import { useFormState } from "react-dom";
import { getTranslations } from "@/lib/i18n";
import { joinWaitlist, type JoinWaitlistResult } from "./actions";

type Props = { source: string; locale: "pt" | "en" };

declare global {
  interface Window {
    fbq?: (action: string, event: string, opts?: Record<string, unknown>) => void;
  }
}

export function FormularioListaEspera({ source, locale }: Props) {
  const t = getTranslations(locale);
  const [state, formAction] = useFormState(joinWaitlist, null as JoinWaitlistResult | null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const prevSuccess = useRef(false);

  const cityOptions = [
    { value: "", label: t("waitlistCityChoose") },
    { value: "Oeiras", label: t("waitlistCityOeiras") },
    { value: "Cascais", label: t("waitlistCityCascais") },
    { value: "Outra", label: t("waitlistCityOther") },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(() => {
      formAction(formData);
    });
  };

  useEffect(() => {
    if (state?.success && !prevSuccess.current) {
      prevSuccess.current = true;
      formRef.current?.reset();
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Lead");
      }
    }
    if (!state?.success) prevSuccess.current = false;
  }, [state?.success]);

  if (state?.success) {
    return (
      <div className="card" style={{ padding: "clamp(24px, 6vw, 32px)", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(1.125rem, 4vw, 1.25rem)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          {t("waitlistSuccessTitle")}
        </h2>
        <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
          {t("waitlistSuccessMessage")}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="card"
      style={{
        padding: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(16px, 4vw, 20px)",
      }}
    >
      <input type="hidden" name="source" value={source} />
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("waitlistFormName")} *
        </span>
        <input type="text" name="name" required className="input" placeholder={t("waitlistPlaceholderName")} autoComplete="name" />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("waitlistFormEmail")} *
        </span>
        <input
          type="email"
          name="email"
          required
          className="input"
          placeholder={t("waitlistPlaceholderEmail")}
          autoComplete="email"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("waitlistFormPhone")} <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{t("waitlistOptional")}</span>
        </span>
        <input
          type="tel"
          name="phone"
          className="input"
          placeholder={t("waitlistPlaceholderPhone")}
          autoComplete="tel"
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
          {t("waitlistFormCity")} <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{t("waitlistOptional")}</span>
        </span>
        <select name="city" className="input">
          {cityOptions.map((o) => (
            <option key={o.value || "empty"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" name="marketing_optin" className="input" style={{ width: "auto", minHeight: 20 }} />
        <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
          {t("waitlistFormMarketing")} <span style={{ opacity: 0.9 }}>{t("waitlistOptional")}</span>
        </span>
      </label>
      {state?.error && (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>{state.error}</p>
      )}
      <button
        type="submit"
        className="btn btn-primary w-full lista-espera-cta"
        style={{ minHeight: 48 }}
        disabled={isPending}
      >
        {isPending ? t("waitlistSaving") : t("waitlistCTA")}
      </button>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
        {t("waitlistFree")}
      </p>
    </form>
  );
}
