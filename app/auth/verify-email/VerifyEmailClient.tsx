"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TurnstileWidget, captchaOptions, turnstileEnabled } from "@/components/TurnstileWidget";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type Props = { email: string; locale: Locale };

export function VerifyEmailClient({ email, locale }: Props) {
  const t = getTranslations(locale);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resend({ type: "signup", email, options: captchaOptions(captchaToken) });
    setCaptchaReset((n) => n + 1);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage(t("verifyEmailResent"));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
      <div className="container-mobile">
        <h1 className="text-mobile-lg font-semibold text-center mb-4" style={{ color: "var(--text-primary)" }}>
          {t("verifyEmailTitle")}
        </h1>
        <p className="text-mobile-base text-center mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("verifyEmailBody").replace("{email}", email || "—")}
        </p>
        {message && (
          <p className="text-mobile-sm text-center mb-4" style={{ color: "var(--success)", margin: 0 }}>
            {message}
          </p>
        )}
        {error && (
          <p className="text-mobile-sm text-center mb-4" style={{ color: "var(--danger)", margin: 0 }}>
            {error}
          </p>
        )}
        <div className="mb-4">
          <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} locale={locale} />
        </div>
        <button
          type="button"
          onClick={handleResend}
          disabled={loading || !email || (turnstileEnabled && !captchaToken)}
          className="btn btn-primary w-full mb-4"
        >
          {loading ? t("loading") : t("verifyEmailResend")}
        </button>
        <p className="text-mobile-base text-center" style={{ color: "var(--text-secondary)" }}>
          <Link href="/sign-in" className="font-semibold" style={{ color: "var(--primary)" }}>
            {t("verifyEmailBackToSignIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
