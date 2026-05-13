"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildEventTicketCheckinUrl } from "@/lib/event-ticket-url";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type Props = {
  eventId: string;
  eventName: string;
  checkinToken: string;
  checkinUsedAt: string | null;
  locale: Locale;
};

export function EventIngressoCard({ eventId, eventName, checkinToken, checkinUsedAt, locale }: Props) {
  const t = getTranslations(locale);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!origin || !checkinToken || !eventId) return;
    const url = buildEventTicketCheckinUrl(origin, eventId, checkinToken);
    let cancelled = false;
    QRCode.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: "M" })
      .then((u) => {
        if (!cancelled) setDataUrl(u);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [checkinToken, eventId]);

  const used = Boolean(checkinUsedAt);

  return (
    <div
      style={{
        marginTop: 12,
        padding: "clamp(14px, 3.5vw, 18px)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>
        {t("eventTicketTitle")}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.45 }}>
        {t("eventTicketSubtitle").replace("{name}", eventName)}
      </p>
      {used ? (
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontWeight: 600,
            color: "var(--primary)",
            textAlign: "center",
          }}
        >
          {t("eventTicketUsedBadge")}
        </p>
      ) : null}
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="" width={240} height={240} style={{ display: "block", borderRadius: 8 }} />
      ) : (
        <div style={{ width: 240, height: 240, background: "var(--bg-secondary)", borderRadius: 8 }} aria-hidden />
      )}
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.45 }}>
        {used ? t("eventTicketUsedHint") : t("eventTicketQrHint")}
      </p>
    </div>
  );
}
