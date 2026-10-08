"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, CheckCircle2, Clock, MapPin, Users } from "lucide-react";
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

/** Bloco de data (mês abreviado + dia) por cima da capa. */
function monthDay(iso: string, locale: Locale): { m: string; d: string } {
  const [y, mo, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  return {
    m: date.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { month: "short" }).replace(".", "").toUpperCase(),
    d: String(d).padStart(2, "0"),
  };
}

/** Capa quando o evento não tem banner: gradiente por tipo. */
const TYPE_COVER: Record<string, string> = {
  CAMP: "linear-gradient(135deg, #3a1d0a 0%, #7c2d12 100%)",
  WORKSHOP: "linear-gradient(135deg, #1e1b3a 0%, #3730a3 100%)",
  OTHER: "linear-gradient(135deg, #2a1215 0%, #7f1d1d 100%)",
};

function formatTimeRange(st: string | null, et: string | null): string | null {
  if (!st?.trim() || !et?.trim()) return null;
  return `${st.trim().slice(0, 5)} – ${et.trim().slice(0, 5)}`;
}

export function EventosBoard({
  events,
  locale,
  registrationsByEventId,
  registrationCounts = {},
}: {
  events: DashboardEventRow[];
  locale: Locale;
  registrationsByEventId: Record<string, EventRegistrationSummary>;
  /** Nº de inscrições activas por evento (só contagens). */
  registrationCounts?: Record<string, number>;
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
          style={{ minHeight: 40, borderRadius: 999 }}
          onClick={() => setRegFilter("all")}
        >
          {t("eventsFilterAll")}
        </button>
        <button
          type="button"
          className={regFilter === "registered" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ minHeight: 40, borderRadius: 999 }}
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
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
            gap: "clamp(12px, 3vw, 16px)",
            alignItems: "start",
          }}
        >
          {displayList.map((e) => {
            const reg = regMap[e.id];
            const isRegistered = reg && (reg.status === "PENDING" || reg.status === "CONFIRMED");
            const banner = e.banner_url?.trim()
              ? (rewriteSupabaseLegacyStoragePublicUrl(e.banner_url.trim()) ?? e.banner_url.trim())
              : "";
            const timeStr = formatTimeRange(e.start_time, e.end_time);
            const md = monthDay(e.start_date ?? e.event_date, locale);
            const regCount = registrationCounts[e.id] ?? 0;
            const spotsLeft = e.max_participants != null ? Math.max(0, e.max_participants - regCount) : null;
            const coverOverlay = (
              <>
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 12,
                    width: 50,
                    height: 54,
                    borderRadius: 12,
                    background: "#fff",
                    color: "#0b0b0b",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#c1121f" }}>{md.m}</span>
                  <span style={{ fontSize: 21, fontWeight: 800, lineHeight: 1 }}>{md.d}</span>
                </span>
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {eventTypeLabel(e.type, t)}
                </span>
                {isRegistered ? (
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      bottom: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "var(--success)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={14} aria-hidden />
                    {t("registered")}
                  </span>
                ) : null}
              </>
            );
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
                      position: "relative",
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
                    <img src={banner} alt="" style={{ width: "100%", height: 170, objectFit: "cover", display: "block", pointerEvents: "none" }} />
                    {coverOverlay}
                  </button>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      height: 130,
                      background: TYPE_COVER[e.type] ?? TYPE_COVER.OTHER,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    <CalendarDays size={44} aria-hidden />
                    {coverOverlay}
                  </div>
                )}
                <div style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {e.name}
                    </span>
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 800, color: "var(--primary)", whiteSpace: "nowrap" }}>
                      {Number(e.price) > 0 ? `€${Number(e.price).toFixed(0)}` : locale === "en" ? "Free" : "Grátis"}
                    </span>
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)" }}>
                    <CalendarDays size={15} aria-hidden />
                    {formatDateRangeLine(e, locale)}
                  </span>
                  {timeStr ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)" }}>
                      <Clock size={15} aria-hidden />
                      {timeStr}
                    </span>
                  ) : null}
                  {e.location?.trim() ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--text-secondary)" }}>
                      <MapPin size={15} aria-hidden />
                      {e.location.trim()}
                    </span>
                  ) : null}
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: spotsLeft === 0 ? "var(--warning)" : "var(--text-secondary)",
                    }}
                  >
                    <Users size={15} aria-hidden />
                    {regCount} {locale === "en" ? "registered" : regCount === 1 ? "inscrito" : "inscritos"}
                    {spotsLeft != null
                      ? ` · ${spotsLeft === 0 ? (locale === "en" ? "full" : "esgotado") : `${spotsLeft} ${locale === "en" ? "spots left" : spotsLeft === 1 ? "vaga" : "vagas"}`}`
                      : ""}
                  </span>
                  {e.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {e.description}
                    </p>
                  )}
                  {isRegistered ? (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      {reg?.status === "CONFIRMED" && e.type === "OTHER" ? (
                        <>
                          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                            <CheckCircle2 size={16} aria-hidden />
                            {t("registered")}
                          </p>
                          <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                            {t("eventOtherNoQrDetail")}
                          </p>
                        </>
                      ) : reg?.status === "CONFIRMED" && reg.checkin_token?.trim() ? (
                        <>
                          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                            <CheckCircle2 size={16} aria-hidden />
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
                        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                          <CheckCircle2 size={16} aria-hidden />
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
