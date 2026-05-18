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

function formatCheckInTimestamp(iso: string | null, locale: Locale): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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

  const { checkedIn, pending } = useMemo(() => {
    const used = participants.filter((p) => p.alreadyUsed);
    const notUsed = participants.filter((p) => !p.alreadyUsed);
    used.sort((a, b) => {
      const ta = a.checkinUsedAt ? new Date(a.checkinUsedAt).getTime() : 0;
      const tb = b.checkinUsedAt ? new Date(b.checkinUsedAt).getTime() : 0;
      return tb - ta;
    });
    notUsed.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, locale === "en" ? "en" : "pt", { sensitivity: "base" })
    );
    return { checkedIn: used, pending: notUsed };
  }, [participants, locale]);

  const matches = useMemo(() => {
    if (needle.length < MIN_LEN) return [];
    return pending
      .filter((p) => fold(p.displayName).includes(needle) || (p.email && fold(p.email).includes(needle)))
      .slice(0, MAX_RESULTS);
  }, [pending, needle]);

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

      {checkedIn.length > 0 ? (
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {t("eventCheckInRecordedHeading")}{" "}
            <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>({checkedIn.length})</span>
          </h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              overflow: "hidden",
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {checkedIn.map((p, idx) => (
              <li
                key={p.registrationId}
                style={{
                  padding: "10px 12px",
                  borderBottom: idx < checkedIn.length - 1 ? "1px solid var(--border)" : undefined,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                  background: "var(--surface)",
                }}
              >
                <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.displayName}</div>
                  {p.email ? (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", wordBreak: "break-all" }}>{p.email}</div>
                  ) : null}
                </div>
                <time
                  dateTime={p.checkinUsedAt ?? undefined}
                  style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {formatCheckInTimestamp(p.checkinUsedAt, locale)}
                </time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <>
          {checkedIn.length > 0 ? (
            <h3 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInPendingHeading")}</h3>
          ) : null}
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>
            {checkedIn.length > 0 ? t("eventCheckInPendingHint") : t("eventCheckInManualHint")}
          </p>
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
            <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{t("eventCheckInManualEmptyPending")}</p>
          )}
          {matches.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0 0", display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
              {matches.map((p) => (
                <li
                  key={p.registrationId}
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{p.displayName}</div>
                    {p.email ? (
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", wordBreak: "break-all" }}>{p.email}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ minHeight: 40, flexShrink: 0 }}
                    disabled={pendingId !== null}
                    onClick={() => void onCheckIn(p.registrationId)}
                  >
                    {pendingId === p.registrationId ? t("eventValidateRedeeming") : t("eventValidateRedeemCta")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p style={{ margin: checkedIn.length > 0 ? "12px 0 0 0" : 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {t("eventCheckInAllPendingDone")}
        </p>
      )}

      {msg && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, color: "var(--danger)" }} role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
