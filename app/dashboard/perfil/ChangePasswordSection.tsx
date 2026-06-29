"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTranslations } from "@/lib/i18n";

type Props = {
  email: string;
  locale: "pt" | "en";
};

export function ChangePasswordSection({ email, locale }: Props) {
  const t = getTranslations(locale);
  const [isOAuthOnly, setIsOAuthOnly] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const provider = data.user?.app_metadata?.provider as string | undefined;
      const providers = (data.user?.app_metadata?.providers as string[] | undefined) ?? [];
      const googleOnly =
        provider === "google" || (providers.length === 1 && providers[0] === "google");
      setIsOAuthOnly(googleOnly);
    });
  }, []);

  if (isOAuthOnly === null) return null;
  if (isOAuthOnly) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError(t("changePasswordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("changePasswordMismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInErr) {
      setLoading(false);
      setError(t("changePasswordWrongCurrent"));
      return;
    }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <section className="card" style={{ marginTop: "clamp(24px, 6vw, 32px)", padding: "clamp(16px, 4vw, 20px)" }}>
      <h2 style={{ margin: "0 0 12px 0", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
        {t("changePasswordTitle")}
      </h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{t("changePasswordCurrent")}</span>
          <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{t("changePasswordNew")}</span>
          <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{t("changePasswordConfirm")}</span>
          <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </label>
        {error && <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{error}</p>}
        {success && <p style={{ margin: 0, fontSize: 14, color: "var(--success)" }}>{t("changePasswordSuccess")}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? t("loading") : t("changePasswordSubmit")}
        </button>
      </form>
    </section>
  );
}
