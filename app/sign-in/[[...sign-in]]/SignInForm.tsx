"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { persistRememberDeviceChoice } from "@/lib/auth/remember-device";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export function SignInForm({ initialLocale }: { initialLocale: Locale }) {
  const t = getTranslations(initialLocale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savePhase, setSavePhase] = useState<"idle" | "saving" | "success">("idle");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");
  const urlError = searchParams.get("error");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overlayOpen = savePhase !== "idle" || googleLoading;
  const overlayMessage = googleLoading
    ? t("signInOpeningGoogle")
    : savePhase === "success"
      ? t("signInSuccessRedirect")
      : t("signingIn");
  const overlayShowSpinner = googleLoading || savePhase === "saving";

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavePhase("saving");
    persistRememberDeviceChoice(rememberDevice);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setSavePhase("idle");
      setError(err.message);
      return;
    }
    setSavePhase("success");
    const target = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/dashboard";
    redirectTimerRef.current = setTimeout(() => {
      router.push(target);
      router.refresh();
    }, 900);
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    persistRememberDeviceChoice(rememberDevice);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = nextUrl && nextUrl.startsWith("/")
      ? `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`
      : `${origin}/auth/callback`;
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (err) {
      setGoogleLoading(false);
      setError(err.message);
      return;
    }
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    setGoogleLoading(false);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
      <LoadingOverlay open={overlayOpen} message={overlayMessage} showSpinner={overlayShowSpinner} />

      <div className="container-mobile">
        <h1 className="text-mobile-lg font-semibold text-center mb-6" style={{ color: "var(--text-primary)" }}>
          {t("signIn")}
        </h1>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="btn btn-secondary w-full flex items-center justify-center gap-2 mb-4"
          aria-label={t("signInWithGoogle")}
        >
          <GoogleIcon />
          {googleLoading ? (initialLocale === "en" ? "Redirecting…" : "A redirecionar…") : t("signInWithGoogle")}
        </button>
        <span className="block text-center text-mobile-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          {initialLocale === "en" ? "or" : "ou"}
        </span>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
            disabled={overlayOpen}
          />
          <input
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
            disabled={overlayOpen}
          />
          <p className="text-mobile-sm text-right" style={{ margin: "-8px 0 0 0" }}>
            <Link href="/auth/forgot-password" style={{ color: "var(--primary)", textDecoration: "none" }}>
              {t("forgotPassword")}
            </Link>
          </p>
          {(error || urlError) && (
            <p className="text-mobile-sm" style={{ color: "var(--danger)", margin: 0 }}>
              {error || (urlError === "exchange_failed" && (initialLocale === "en" ? "Login failed. Please try again." : "Falha ao iniciar sessão. Tenta novamente.")) || (urlError === "missing_code" && (initialLocale === "en" ? "Invalid callback." : "Callback inválido.")) || (urlError === "no_user" && (initialLocale === "en" ? "No user returned." : "Sessão não encontrada."))}
            </p>
          )}
          <button type="submit" disabled={overlayOpen} className="btn btn-primary w-full">
            {t("signIn")}
          </button>
        </form>
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-left">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            disabled={overlayOpen}
            className="h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
          <span className="text-mobile-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {t("rememberDevice")}
          </span>
        </label>
        <p className="text-mobile-base text-center mt-6" style={{ color: "var(--text-secondary)" }}>
          {t("noAccountYet")}{" "}
          <Link href="/sign-up" className="font-semibold" style={{ color: "var(--primary)" }}>
            {t("signUp")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
