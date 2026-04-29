"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useCallback, useMemo, useState } from "react";
import { getTranslations, type MessageKey } from "@/lib/i18n";
import type { AdminPermissionRow, UpdateUserAdminPermsResult } from "./actions";
import { updateUserAdminPermissions } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="button"
      disabled={pending}
      style={{ marginTop: 8, alignSelf: "flex-start" }}
    >
      {pending ? "…" : label}
    </button>
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

  const toggle = useCallback((code: string, on: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (on) n.add(code);
      else n.delete(code);
      return n;
    });
  }, []);

  if (readonlyCoach) {
    return (
      <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 520 }}>{t("permissionsCoachBlock")}</p>
    );
  }

  const codesStr = [...selected].join(",");

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="codes" value={codesStr} readOnly />
      <input type="hidden" name="adminUseGranular" value={granular ? "true" : "false"} />

      {state?.error && (
        <p style={{ color: "var(--error)" }} role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p style={{ color: "var(--ok, #0a0)" }} role="status">
          {t("permissionsSaved")}
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
  );
}
