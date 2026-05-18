"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { rewriteSupabaseLegacyStoragePublicUrl } from "@/lib/supabase/rewrite-storage-public-url";
import { EventCalendar, eventTouchesDay, type EventCalendarRow } from "@/components/events/EventCalendar";
import { EventIngressoCard } from "./EventIngressoCard";
import { InscreverMeButton } from "./InscreverMeButton";

function eventTypeLabel(type: string, t: ReturnType<typeof getTranslations>): string {
  if (type === "CAMP") return t("eventsTypeCamp");
  if (type === "WORKSHOP") return t("eventsTypeWorkshop");
  if (type === "OTHER") return t("eventsTypeOther");
  return type;
}

export type EventRegistrationSummary = {
  status: string;
  checkin_token: string | null;
  checkin_used_at: string | null;
};

export type DashboardEventRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  event_date: string;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  banner_url: string | null;
  price: number;
  max_participants: number | null;
};

function formatOneDay(iso: string, locale: Locale): string {
  try {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateRangeLine(e: DashboardEventRow, locale: Locale): string {
  const s = (e.start_date ?? e.event_date).slice(0, 10);
  const end = (e.end_date ?? e.event_date).slice(0, 10);
  if (s === end) return formatOneDay(s, locale);
  return `${formatOneDay(s, locale)} → ${formatOneDay(end, locale)}`;
}

function formatTimeRange(st: string | null, et: string | null): string | null {
  if (!st?.trim() || !et?.trim()) return null;
  return `${st.trim().slice(0, 5)} – ${et.trim().slice(0, 5)}`;
}

export function EventosBoard({
  events,
  locale,
  registrationsByEventId,
}: {
  events: DashboardEventRow[];
  locale: Locale;
  registrationsByEventId: Record<string, EventRegistrationSummary>;
}) {
  const t = getTranslations(locale);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [regFilter, setRegFilter] = useState<"all" | "registered">("all");
  const [bannerLightbox, setBannerLightbox] = useState<{ src: string; eventName: string } | null>(null);
  const [bannerPortalReady, setBannerPortalReady] = useState(false);

  useEffect(() => {
    setBannerPortalReady(true);
  }, []);

  useEffect(() => {
    if (!bannerLightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setBannerLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [bannerLightbox]);

  const calendarRows: EventCalendarRow[] = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        name: e.name,
        event_date: e.event_date,
        start_date: e.start_date,
        end_date: e.end_date,
        type: e.type,
      })),
    [events]
  );

  const listByDay = useMemo(() => {
    if (!selectedIso) return events;
    return events.filter((e) => eventTouchesDay(selectedIso, e));
  }, [events, selectedIso]);

  const displayList = useMemo(() => {
    if (regFilter !== "registered") return listByDay;
    return listByDay.filter((e) => {
      const r = registrationsByEventId[e.id];
      return r && (r.status === "PENDING" || r.status === "CONFIRMED");
    });
  }, [listByDay, regFilter, registrationsByEventId]);

  const labels = useMemo(() => {
    const tr = getTranslations(locale);
    return {
      title: tr("eventsCalendarTitle"),
      hint: tr("eventsCalendarHint"),
      prev: tr("eventsCalendarPrev"),
      next: tr("eventsCalendarNext"),
      filterAll: tr("eventsCalendarShowAll"),
    };
  }, [locale]);

  const countLabel = (() => {
    if (selectedIso) return t("eventsListCountFiltered").replace("{n}", String(displayList.length));
    if (regFilter === "registered") return t("eventsListCountRegistered").replace("{n}", String(displayList.length));
    return t("eventsListCountAll").replace("{n}", String(events.length));
  })();

  const regMap = registrationsByEventId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group" aria-label={t("eventsFilterGroupAria")}>
        <button
          type="button"
          className={regFilter === "all" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ minHeight: 40 }}
          onClick={() => setRegFilter("all")}
        >
          {t("eventsFilterAll")}
        </button>
        <button
          type="button"
          className={regFilter === "registered" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ minHeight: 40 }}
          onClick={() => setRegFilter("registered")}
        >
          {t("eventsFilterRegisteredActive")}
        </button>
      </div>

      <details
        style={{
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            padding: "clamp(12px, 3vw, 14px) clamp(14px, 3.5vw, 16px)",
            fontWeight: 600,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
            listStyle: "none",
          }}
        >
          {t("eventsCalendarSummary")}
        </summary>
        <div style={{ padding: "0 clamp(14px, 3.5vw, 16px) clamp(14px, 3.5vw, 16px)" }}>
          <EventCalendar
            events={calendarRows}
            locale={locale === "en" ? "en" : "pt"}
            labels={labels}
            selectedIso={selectedIso}
            onSelectIso={setSelectedIso}
          />
        </div>
      </details>

      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{countLabel}</p>

      {displayList.length === 0 ? (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
            {events.length === 0
              ? t("eventsEmpty")
              : regFilter === "registered"
                ? t("eventsEmptyRegisteredFilter")
                : t("eventsEmptyDay")}
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
          {displayList.map((e) => {
            const reg = regMap[e.id];
            const isRegistered = reg && (reg.status === "PENDING" || reg.status === "CONFIRMED");
            const banner = e.banner_url?.trim()
              ? (rewriteSupabaseLegacyStoragePublicUrl(e.banner_url.trim()) ?? e.banner_url.trim())
              : "";
            const timeStr = formatTimeRange(e.start_time, e.end_time);
            return (
              <li
                key={e.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {banner ? (
                  <button
                    type="button"
                    onClick={() => setBannerLightbox({ src: banner, eventName: e.name })}
                    aria-label={t("eventsBannerOpenFullAria")}
                    style={{
                      border: "none",
                      padding: 0,
                      margin: 0,
                      display: "block",
                      width: "100%",
                      cursor: "zoom-in",
                      background: "transparent",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={banner} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block", pointerEvents: "none" }} />
                  </button>
                ) : null}
                <div style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: "clamp(12px, 3vw, 14px)",
                        padding: "2px 8px",
                        background: "var(--surface)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {eventTypeLabel(e.type, t)}
                    </span>
                    <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      {formatDateRangeLine(e, locale)}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--primary)" }}>
                      €{Number(e.price).toFixed(0)}
                    </span>
                  </div>
                  {timeStr ? (
                    <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>{t("eventsTimePrefix")}:</strong> {timeStr}
                    </span>
                  ) : null}
                  {e.location?.trim() ? (
                    <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--text-primary)" }}>{t("eventsLocationPrefix")}:</strong> {e.location.trim()}
                    </span>
                  ) : null}
                  <span style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>{e.name}</span>
                  {e.description && (
                    <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {e.description}
                    </p>
                  )}
                  {isRegistered ? (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      {reg?.status === "CONFIRMED" && e.type === "OTHER" ? (
                        <>
                          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500 }}>
                            {t("registered")}
                          </p>
                          <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                            {t("eventOtherNoQrDetail")}
                          </p>
                        </>
                      ) : reg?.status === "CONFIRMED" && reg.checkin_token?.trim() ? (
                        <>
                          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500 }}>
                            {t("registered")}
                          </p>
                          <EventIngressoCard
                            eventId={e.id}
                            eventName={e.name}
                            checkinToken={reg.checkin_token.trim()}
                            checkinUsedAt={reg.checkin_used_at}
                            locale={locale}
                          />
                        </>
                      ) : reg?.status === "CONFIRMED" ? (
                        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500 }}>
                          {t("registered")}
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                          {t("registeredPendingDetail")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <InscreverMeButton eventId={e.id} eventName={e.name} price={Number(e.price)} initialLocale={locale} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {bannerPortalReady && bannerLightbox
        ? createPortal(
            <div
              role="dialog"
              aria-modal={true}
              aria-label={bannerLightbox.eventName}
              onClick={() => setBannerLightbox(null)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 10060,
                background: "rgba(0, 0, 0, 0.88)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding:
                  "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={() => setBannerLightbox(null)}
                aria-label={t("close")}
                style={{
                  position: "absolute",
                  top: "max(12px, env(safe-area-inset-top))",
                  right: "max(12px, env(safe-area-inset-right))",
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  background: "rgba(0,0,0,0.45)",
                  color: "#fff",
                  fontSize: 22,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
              <div
                onClick={(ev) => ev.stopPropagation()}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerLightbox.src}
                  alt={bannerLightbox.eventName}
                  style={{
                    maxWidth: "min(100%, 960px)",
                    maxHeight: "min(85dvh, 100%)",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.95)",
                    textAlign: "center",
                    maxWidth: "min(100%, 560px)",
                    lineHeight: 1.35,
                  }}
                >
                  {bannerLightbox.eventName}
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
