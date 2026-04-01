"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export function ForgotPasswordForm({ initialLocale }: { initialLocale: Locale }) {
  const t = getTranslations(initialLocale);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    /** Mesma página onde o browser troca o `code` (PKCE); tem de estar nas Redirect URLs do Supabase. */
    const redirectTo = `${origin}/auth/update-password`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="input"
          />
          {error && (
            <p className="text-mobile-sm" style={{ color: "var(--danger)", margin: 0 }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? t("loading") : t("forgotPasswordSubmit")}
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
