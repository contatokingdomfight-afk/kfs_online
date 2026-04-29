"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTranslations, type MessageKey } from "@/lib/i18n";
import type { AdminPermissionRow, UpdateUserAdminPermsResult } from "./actions";
import { updateUserAdminPermissions } from "./actions";

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

function SavePendingModal({ locale }: { locale: "pt" | "en" }) {
  const { pending } = useFormStatus();
  const t = getTranslations(locale);
  if (!pending) return null;
  return (
    <div
      style={modalOverlayStyle}
      aria-hidden="true"
      aria-live="polite"
      role="status"
    >
      <div
        className="card"
        style={{
          maxWidth: 400,
          width: "100%",
          padding: "clamp(20px, 5vw, 28px)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span className="kfs-save-spinner" aria-hidden />
          <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)", fontWeight: 500 }}>
            {t("savingLabel")}
          </p>
        </div>
      </div>
    </div>
  );
}

function SaveSuccessModal({
  locale,
  onClose,
}: {
  locale: "pt" | "en";
  onClose: () => void;
}) {
  const t = getTranslations(locale);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      style={modalOverlayStyle}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="permissions-success-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 420,
          width: "100%",
          padding: "clamp(22px, 5.5vw, 28px)",
        }}
      >
        <h2
          id="permissions-success-title"
          style={{
            margin: "0 0 12px 0",
            fontSize: "clamp(17px, 4.2vw, 20px)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {t("permissionsSaveSuccessTitle")}
        </h2>
        <p
          style={{
            margin: "0 0 clamp(20px, 5vw, 24px) 0",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            lineHeight: 1.5,
            color: "var(--text-secondary)",
          }}
        >
          {t("permissionsSaved")}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="button"
            onClick={onClose}
            autoFocus
            style={{ minWidth: 88 }}
          >
            {t("permissionsSaveModalButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

function moduleTitleKey(module: string): MessageKey {
  return `permissionsModule_${module}` as MessageKey;
}

export function AdminUserPermissionsForm({
  userId,
  initialGranular,
  initialCodes,
  catalog,
  readonlyCoach,
  soleAdmin,
  locale,
}: {
  userId: string;
  initialGranular: boolean;
  initialCodes: string[];
  catalog: AdminPermissionRow[];
  readonlyCoach: boolean;
  soleAdmin: boolean;
  locale: "pt" | "en";
}) {
  const t = getTranslations(locale);
  const [state, formAction] = useFormState(updateUserAdminPermissions, null as UpdateUserAdminPermsResult | null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [granular, setGranular] = useState(initialGranular);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialCodes));

  const byModule = useMemo(() => {
    const m = new Map<string, AdminPermissionRow[]>();
    for (const row of catalog) {
      const g = m.get(row.module) ?? [];
      g.push(row);
      m.set(row.module, g);
    }
    return m;
  }, [catalog]);

  useEffect(() => {
    if (state?.success) setShowSuccessModal(true);
    if (state?.error) setShowSuccessModal(false);
  }, [state]);

  const toggle = useCallback((code: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(code);
      else n.delete(code);
      return n;
    });
  }, []);

  useEffect(() => {
    if (!showSuccessModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showSuccessModal]);

  if (readonlyCoach) {
    return (
      <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 520 }}>{t("permissionsCoachBlock")}</p>
    );
  }

  const codesStr = [...selected].join(",");

  return (
    <>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SavePendingModal locale={locale} />
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="codes" value={codesStr} readOnly />
        <input type="hidden" name="adminUseGranular" value={granular ? "true" : "false"} />

        {state?.error && (
          <p style={{ color: "var(--error)" }} role="alert">
            {state.error}
          </p>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            cursor: soleAdmin ? "not-allowed" : "pointer",
            opacity: soleAdmin ? 0.6 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={granular}
            disabled={soleAdmin}
            onChange={(e) => {
              setGranular(e.target.checked);
            }}
          />
          <span>
            <span style={{ fontWeight: 600, display: "block" }}>{t("permissionsGranularLabel")}</span>
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{t("permissionsGranularHint")}</span>
            {soleAdmin && (
              <span style={{ display: "block", marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                {locale === "pt"
                  ? "Há apenas um administrador: mantém acesso completo para evitares bloquear a organização; adiciona outro admin e depois podes restringir."
                  : "There is only one admin: keep full access to avoid lockout; add a second admin before using granular control."}
              </span>
            )}
          </span>
        </label>

        {granular && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[...byModule.entries()].map(([mod, rows]) => (
              <div key={mod} className="card" style={{ padding: "16px 20px" }}>
                <h2
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {t("permissionsGroupPrefix")}
                  {t(moduleTitleKey(mod))}
                </h2>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                  {rows.map((r) => (
                    <li key={r.code}>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selected.has(r.code)}
                          onChange={(e) => toggle(r.code, e.target.checked)}
                        />
                        <span style={{ fontSize: 14, lineHeight: 1.4 }}>{locale === "pt" ? r.labelPt : r.labelEn}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <SubmitButton label={t("permissionsSave")} />
      </form>

      {showSuccessModal && state?.success ? (
        <SaveSuccessModal locale={locale} onClose={() => setShowSuccessModal(false)} />
      ) : null}
    </>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="button"
      disabled={pending}
      style={{ marginTop: 8, alignSelf: "flex-start" }}
    >
      {label}
    </button>
  );
}
