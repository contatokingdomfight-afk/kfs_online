"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventCheckInParticipantRow } from "@/lib/event-checkin-participants";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { redeemEventTicket } from "../../actions";
import { ManualCheckInSearch } from "./ManualCheckInSearch";
import { TicketQrScanner } from "./TicketQrScanner";

export type IngressoPreview = {
  eventName: string;
  studentName: string;
  alreadyUsed: boolean;
  status: string;
};

type Props = {
  eventId: string;
  locale: Locale;
  token: string;
  preview: IngressoPreview | null;
  invalidToken: boolean;
  notAdmin: boolean;
  wrongEvent: boolean;
  participants: EventCheckInParticipantRow[];
};

function withAdminExtras(
  notAdmin: boolean,
  eventId: string,
  locale: Locale,
  participants: EventCheckInParticipantRow[],
  node: ReactNode
) {
  if (notAdmin) return node;
  return (
    <>
      {node}
      <ManualCheckInSearch participants={participants} eventId={eventId} locale={locale} />
      <div style={{ maxWidth: 480, width: "100%" }}>
        <TicketQrScanner eventId={eventId} locale={locale} />
      </div>
    </>
  );
}

export function IngressoValidator({
  eventId,
  locale,
  token,
  preview,
  invalidToken,
  notAdmin,
  wrongEvent,
  participants,
}: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (notAdmin) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>{t("eventValidateNotAdmin")}</p>
      </div>
    );
  }

  if (!token) {
    return withAdminExtras(
      notAdmin,
      eventId,
      locale,
      participants,
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInTitle")}</h1>
      </div>
    );
  }

  if (invalidToken) {
    return withAdminExtras(
      notAdmin,
      eventId,
      locale,
      participants,
      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInTitle")}</h1>
        <p style={{ margin: 0, color: "var(--danger)" }}>{t("eventValidateInvalidToken")}</p>
      </div>
    );
  }

  if (wrongEvent) {
    return withAdminExtras(
      notAdmin,
      eventId,
      locale,
      participants,
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInTitle")}</h1>
        <p style={{ margin: 0, color: "var(--danger)" }}>{t("eventTicketWrongEvent")}</p>
      </div>
    );
  }

  if (!preview) {
    return withAdminExtras(
      notAdmin,
      eventId,
      locale,
      participants,
      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInTitle")}</h1>
        <p style={{ margin: 0, color: "var(--danger)" }}>{t("eventValidateNotFound")}</p>
      </div>
    );
  }

  if (preview.status !== "CONFIRMED") {
    return withAdminExtras(
      notAdmin,
      eventId,
      locale,
      participants,
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInTitle")}</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>{t("eventValidatePendingReg")}</p>
      </div>
    );
  }

  async function onRedeem() {
    setMsg(null);
    setPending(true);
    const res = await redeemEventTicket(token, eventId);
    setPending(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return withAdminExtras(
    notAdmin,
    eventId,
    locale,
    participants,
    <div className="card" style={{ padding: "clamp(20px, 5vw, 28px)", maxWidth: 480 }}>
      <h1 style={{ margin: "0 0 16px 0", fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 600, color: "var(--text-primary)" }}>{t("eventCheckInTitle")}</h1>
      <p style={{ margin: "0 0 8px 0", fontSize: 15, color: "var(--text-primary)" }}>
        <strong>{t("eventValidateFieldEvent")}:</strong> {preview.eventName}
      </p>
      <p style={{ margin: "0 0 20px 0", fontSize: 15, color: "var(--text-primary)" }}>
        <strong>{t("eventValidateFieldStudent")}:</strong> {preview.studentName}
      </p>

      {preview.alreadyUsed ? (
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>{t("eventValidateUsed")}</p>
      ) : done ? (
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>{t("eventValidateDoneSuccess")}</p>
      ) : (
        <>
          <button type="button" className="btn btn-primary" style={{ width: "100%", minHeight: 44 }} disabled={pending} onClick={onRedeem}>
            {pending ? t("eventValidateRedeeming") : t("eventValidateRedeemCta")}
          </button>
          <p style={{ margin: "12px 0 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>{t("eventValidateRedeemHint")}</p>
        </>
      )}

      {msg && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, color: "var(--danger)" }} role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
