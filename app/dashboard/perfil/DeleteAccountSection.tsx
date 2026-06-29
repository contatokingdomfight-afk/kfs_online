"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "./delete-account-actions";
import { getTranslations } from "@/lib/i18n";

type Props = { locale: "pt" | "en" };

export function DeleteAccountSection({ locale }: Props) {
  const t = getTranslations(locale);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMyAccount(confirmText);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <section
      className="card"
      style={{
        marginTop: "clamp(24px, 6vw, 32px)",
        padding: "clamp(16px, 4vw, 20px)",
        borderColor: "var(--danger)",
      }}
    >
      <h2 style={{ margin: "0 0 8px 0", fontSize: 17, fontWeight: 600, color: "var(--danger)" }}>
        {t("deleteAccountTitle")}
      </h2>
      <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {t("deleteAccountWarning")}
      </p>
      {!open ? (
        <button type="button" className="btn btn-secondary" style={{ fontSize: 14, color: "var(--danger)" }} onClick={() => setOpen(true)}>
          {t("deleteAccountButton")}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>{t("deleteAccountConfirmHint")}</p>
          <input
            type="text"
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            autoComplete="off"
          />
          {error && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="btn btn-primary" disabled={pending} onClick={handleDelete} style={{ background: "var(--danger)" }}>
              {pending ? t("loading") : t("deleteAccountConfirm")}
            </button>
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => { setOpen(false); setConfirmText(""); setError(null); }}>
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
