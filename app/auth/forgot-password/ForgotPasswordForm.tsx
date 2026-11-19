"use client";

import { useActionState, useEffect, useState } from "react";
import { TurnstileWidget, turnstileEnabled } from "@/components/TurnstileWidget";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { requestPasswordReset, type RequestPasswordResetState } from "./actions";

export function ForgotPasswordForm({ initialLocale }: { initialLocale: Locale }) {
  const t = getTranslations(initialLocale);
  const [state, formAction, pending] = useActionState(requestPasswordReset, null as RequestPasswordResetState | null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  // O token só vale uma vez: depois de cada tentativa falhada pede-se um novo.
  useEffect(() => {
    if (state?.error) setCaptchaReset((n) => n + 1);
  }, [state]);

  if (state?.success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
        <div className="container-mobile">
          <p className="text-mobile-base text-center mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {t("forgotPasswordSent")}
          </p>
          <Link href="/sign-in" className="btn btn-primary w-full" style={{ textAlign: "center", textDecoration: "none" }}>
            {t("forgotPasswordBackToSignIn")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
      <div className="container-mobile">
        <h1 className="text-mobile-lg font-semibold text-center mb-2" style={{ color: "var(--text-primary)" }}>
          {t("forgotPasswordTitle")}
        </h1>
        <p className="text-mobile-sm text-center mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("forgotPasswordDescription")}
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder={t("email")}
            required
            autoComplete="email"
            className="input"
          />
          {state?.error && (
            <p className="text-mobile-sm" style={{ color: "var(--danger)", margin: 0 }}>
              {state.error}
            </p>
          )}
          <input type="hidden" name="captchaToken" value={captchaToken ?? ""} />
          <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} locale={initialLocale} />
          <button type="submit" disabled={pending || (turnstileEnabled && !captchaToken)} className="btn btn-primary w-full">
            {pending ? t("loading") : t("forgotPasswordSubmit")}
          </button>
        </form>
        <p className="text-mobile-base text-center mt-6" style={{ color: "var(--text-secondary)" }}>
          <Link href="/sign-in" className="font-semibold" style={{ color: "var(--primary)" }}>
            {t("forgotPasswordBackToSignIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
