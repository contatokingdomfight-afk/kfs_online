"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

/**
 * Sessão de recuperação é criada em GET /auth/callback (servidor, cookies + PKCE).
 * Aqui só confirmamos sessão e permitimos definir nova senha.
 */
export function UpdatePasswordForm({ initialLocale }: { initialLocale: Locale }) {
  const t = getTranslations(initialLocale);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savePhase, setSavePhase] = useState<"idle" | "saving" | "success">("idle");
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
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

    setSavePhase("saving");
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setSavePhase("idle");
      setError(err.message);
      return;
    }

    setSavePhase("success");
    redirectTimerRef.current = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 900);
  }

  const overlayOpen = savePhase !== "idle";
  const overlayMessage =
    savePhase === "success" ? t("updatePasswordSuccess") : t("updatePasswordSaving");

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
      <LoadingOverlay open={overlayOpen} message={overlayMessage} showSpinner={savePhase === "saving"} />

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
            disabled={overlayOpen}
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
            disabled={overlayOpen}
          />
          {error && (
            <p className="text-mobile-sm" style={{ color: "var(--danger)", margin: 0 }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={overlayOpen} className="btn btn-primary w-full">
            {t("updatePasswordSubmit")}
          </button>
        </form>
      </div>
    </main>
  );
}
