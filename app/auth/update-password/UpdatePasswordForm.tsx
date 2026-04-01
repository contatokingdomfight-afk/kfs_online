"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export function UpdatePasswordForm({ initialLocale }: { initialLocale: Locale }) {
  const t = getTranslations(initialLocale);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    if (password.length < 6) {
      setError(initialLocale === "en" ? "Password must be at least 6 characters." : "A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (sessionReady === false) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
        <div className="container-mobile text-center">
          <p className="text-mobile-base mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {initialLocale === "en"
              ? "Session expired or invalid link. Request a new reset from the sign-in page."
              : "Sessão expirada ou link inválido. Pedir novo link na página de login."}
          </p>
          <Link href="/auth/forgot-password" className="btn btn-primary" style={{ textDecoration: "none" }}>
            {t("forgotPasswordTitle")}
          </Link>
        </div>
      </main>
    );
  }

  if (sessionReady === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
        <p className="text-mobile-sm" style={{ color: "var(--text-secondary)" }}>
          {t("loading")}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
      <div className="container-mobile">
        <h1 className="text-mobile-lg font-semibold text-center mb-2" style={{ color: "var(--text-primary)" }}>
          {t("updatePasswordTitle")}
        </h1>
        <p className="text-mobile-sm text-center mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("updatePasswordDescription")}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="input"
          />
          <input
            type="password"
            placeholder={t("passwordConfirmPlaceholder")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="input"
          />
          {error && (
            <p className="text-mobile-sm" style={{ color: "var(--danger)", margin: 0 }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? t("loading") : t("updatePasswordSubmit")}
          </button>
        </form>
      </div>
    </main>
  );
}
