"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EventCheckInParticipantRow } from "@/lib/event-checkin-participants";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { redeemEventCheckinByRegistrationId } from "../../actions";

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

const MIN_LEN = 2;
const MAX_RESULTS = 15;

type Props = {
  participants: EventCheckInParticipantRow[];
  eventId: string;
  locale: Locale;
};

export function ManualCheckInSearch({ participants, eventId, locale }: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const trimmed = q.trim();
  const needle = fold(trimmed);

  const matches = useMemo(() => {
    if (needle.length < MIN_LEN) return [];
    return participants
      .filter((p) => fold(p.displayName).includes(needle) || (p.email && fold(p.email).includes(needle)))
      .slice(0, MAX_RESULTS);
  }, [participants, needle]);

  async function onCheckIn(registrationId: string) {
    setMsg(null);
    setPendingId(registrationId);
    const res = await redeemEventCheckinByRegistrationId(registrationId, eventId);
    setPendingId(null);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    router.refresh();
  }

  if (participants.length === 0) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInManualHeading")}</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{t("eventCheckInManualNoConfirmed")}</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 520 }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInManualHeading")}</h2>
      <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>{t("eventCheckInManualHint")}</p>
      <input
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("eventCheckInManualPlaceholder")}
        aria-label={t("eventCheckInManualPlaceholder")}
        style={{
          width: "100%",
          minHeight: 44,
          padding: "10px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          fontSize: 16,
          background: "var(--bg)",
          color: "var(--text-primary)",
        }}
      />
      {trimmed.length > 0 && trimmed.length < MIN_LEN && (
        <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{t("eventCheckInManualMinChars")}</p>
      )}
      {needle.length >= MIN_LEN && matches.length === 0 && (
        <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{t("eventCheckInManualEmpty")}</p>
      )}
      {matches.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0 0", display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
          {matches.map((p) => (
            <li
              key={p.registrationId}
              className="card"
              style={{
                padding: "12px 14px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 10,
                background: "var(--surface)",
              }}
            >
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{p.displayName}</div>
                {p.email ? (
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", wordBreak: "break-all" }}>{p.email}</div>
                ) : null}
              </div>
              {p.alreadyUsed ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{t("eventCheckInUsedBadge")}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: 40, flexShrink: 0 }}
                  disabled={pendingId !== null}
                  onClick={() => void onCheckIn(p.registrationId)}
                >
                  {pendingId === p.registrationId ? t("eventValidateRedeeming") : t("eventValidateRedeemCta")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, color: "var(--danger)" }} role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
