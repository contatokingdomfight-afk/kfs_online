"use client";

import Link from "next/link";
import { useState } from "react";
import { Target, Flag, MessageSquareQuote, CalendarDays, ChevronDown } from "lucide-react";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { weekdayShortLabelForPublicSchedule } from "@/lib/weekday-labels";
import { VideoPlayer } from "@/components/biblioteca/VideoPlayer";

type WeekTheme = {
  modality: string;
  title: string;
  description: string | null;
  course_id: string | null;
  unit_id: string | null;
  video_url: string | null;
};

type Mission = {
  id: string;
  name: string;
  description: string | null;
  xpReward: number;
};

type CoachFeedback = {
  content: string;
  coachName: string;
  date: string;
};

type WhatIsNewLabels = {
  title: string;
  tabTheme: string;
  tabMission: string;
  tabFeedback: string;
  viewTheory: string;
  viewLesson: string;
  viewVideo: string;
  hideVideo: string;
  noWeekTheme: string;
  weekThemeDaysSectionLabel: string;
  weekThemeTodayBadge: string;
  viewAllMissions: string;
  noMissions: string;
  noCoachFeedback: string;
  /** Texto do link para a página de desempenho (com feedback com avaliação). */
  viewPerformanceLink: string;
  /** Texto do link para a grade mensal (mês atual + seguinte). */
  viewFullMonthLink: string;
};

type WeekThemeDay = { weekday: number; topic: string };

type Props = {
  /** Um tema por modalidade a que o aluno tem acesso (normalmente 1, mas pode ser mais com plano "todas as modalidades"). */
  weekThemes: (WeekTheme & { days: WeekThemeDay[] })[];
  todayWeekday?: number;
  nextMission: Mission | null;
  coachFeedback: CoachFeedback | null;
  locale: "pt" | "en";
  labels: WhatIsNewLabels;
};

const TABS = ["theme", "mission", "feedback"] as const;

export function WhatIsNew({ weekThemes, todayWeekday, nextMission, coachFeedback, locale, labels }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("theme");
  const [openVideoModality, setOpenVideoModality] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Record<string, number>>({});
  const [openDescription, setOpenDescription] = useState<Record<string, boolean>>({});
  const [expandedTopic, setExpandedTopic] = useState<Record<string, boolean>>({});
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const pt = locale !== "en";

  const tabs = [
    { id: "theme" as const, label: pt ? "Tema" : "Theme", icon: <CalendarDays size={16} aria-hidden />, aria: labels.tabTheme },
    { id: "mission" as const, label: pt ? "Missão" : "Mission", icon: <Flag size={16} aria-hidden />, aria: labels.tabMission },
    { id: "feedback" as const, label: pt ? "Coach" : "Coach", icon: <MessageSquareQuote size={16} aria-hidden />, aria: labels.tabFeedback },
  ];

  return (
    <section>
      <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
        <Target size={18} aria-hidden />
        {labels.title}
      </h2>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.aria}
              aria-pressed={activeTab === tab.id}
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "12px 8px",
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 700 : 500,
                background: activeTab === tab.id ? "var(--surface)" : "transparent",
                color: activeTab === tab.id ? "var(--primary)" : "var(--text-secondary)",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
          {activeTab === "theme" && (
            <div>
              {weekThemes.length > 0 ? (
                weekThemes.map((weekTheme, idx) => {
                  const videoOpen = openVideoModality === weekTheme.modality;
                  return (
                    <div
                      key={weekTheme.modality}
                      style={idx > 0 ? { marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" } : undefined}
                    >
                      {(() => {
                        const mod = weekTheme.modality;
                        const days = weekTheme.days;
                        // Dia aberto por omissão: hoje, senão o próximo com tema, senão o primeiro.
                        const defaultDay =
                          days.find((d) => d.weekday === todayWeekday)?.weekday ??
                          days.find((d) => todayWeekday != null && d.weekday > todayWeekday)?.weekday ??
                          days[0]?.weekday;
                        const activeDay = selectedDay[mod] ?? defaultDay;
                        const day = days.find((d) => d.weekday === activeDay) ?? null;
                        const topicKey = `${mod}-${activeDay}`;
                        const topicExpanded = Boolean(expandedTopic[topicKey]);
                        const descriptionOpen = Boolean(openDescription[mod]);
                        return (
                          <>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 10px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                              }}
                            >
                              {MODALITY_LABELS[mod] ?? mod}
                            </span>
                            <p style={{ margin: "8px 0 12px 0", fontSize: "clamp(17px, 4.2vw, 19px)", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3 }}>
                              {weekTheme.title}
                            </p>

                            {days.length > 0 ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "0 0 12px 0" }}>
                                <div role="tablist" aria-label={labels.weekThemeDaysSectionLabel} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {days.map((d) => {
                                    const on = d.weekday === activeDay;
                                    const isToday = d.weekday === todayWeekday;
                                    return (
                                      <button
                                        key={d.weekday}
                                        type="button"
                                        role="tab"
                                        aria-selected={on}
                                        onClick={() => setSelectedDay((p) => ({ ...p, [mod]: d.weekday }))}
                                        style={{
                                          height: 36,
                                          padding: "0 14px",
                                          borderRadius: 999,
                                          border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
                                          background: on ? "var(--primary)" : "transparent",
                                          color: on ? "#fff" : "var(--text-primary)",
                                          fontSize: 13,
                                          fontWeight: 700,
                                          cursor: "pointer",
                                        }}
                                      >
                                        {weekdayShortLabelForPublicSchedule(d.weekday, locale)}
                                        {isToday ? ` · ${labels.weekThemeTodayBadge}` : ""}
                                      </button>
                                    );
                                  })}
                                </div>
                                {day ? (
                                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--border)" }}>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: 14,
                                        lineHeight: 1.5,
                                        color: "var(--text-primary)",
                                        ...(topicExpanded
                                          ? {}
                                          : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }),
                                      }}
                                    >
                                      {day.topic}
                                    </p>
                                    {day.topic.length > 140 ? (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedTopic((p) => ({ ...p, [topicKey]: !p[topicKey] }))}
                                        style={{ border: 0, background: "none", padding: "6px 0 0", color: "var(--primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                                      >
                                        {topicExpanded ? (pt ? "Ver menos" : "Show less") : pt ? "Ver mais" : "Show more"}
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {weekTheme.description ? (
                              <div style={{ margin: "0 0 12px 0" }}>
                                <button
                                  type="button"
                                  aria-expanded={descriptionOpen}
                                  onClick={() => setOpenDescription((p) => ({ ...p, [mod]: !p[mod] }))}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    border: 0,
                                    background: "none",
                                    padding: 0,
                                    color: "var(--text-secondary)",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  <ChevronDown
                                    size={16}
                                    aria-hidden
                                    style={{ transform: descriptionOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
                                  />
                                  {descriptionOpen
                                    ? pt
                                      ? "Esconder descrição da semana"
                                      : "Hide week description"
                                    : pt
                                      ? "Ver descrição da semana"
                                      : "See week description"}
                                </button>
                                {descriptionOpen ? (
                                  <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, whiteSpace: "pre-line" }}>
                                    {weekTheme.description}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                      {(weekTheme.course_id || weekTheme.unit_id || weekTheme.video_url) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {weekTheme.unit_id && weekTheme.course_id ? (
                            <Link
                              href={`/dashboard/biblioteca/${weekTheme.course_id}?unit=${weekTheme.unit_id}`}
                              className="btn btn-primary"
                              style={{
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "clamp(14px, 3.5vw, 16px)",
                                minHeight: 44,
                              }}
                            >
                              {labels.viewLesson}
                            </Link>
                          ) : null}
                          {weekTheme.course_id ? (
                            <Link
                              href={`/dashboard/biblioteca/${weekTheme.course_id}`}
                              className={weekTheme.unit_id ? "btn btn-secondary" : "btn btn-primary"}
                              style={{
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "clamp(14px, 3.5vw, 16px)",
                                minHeight: 44,
                              }}
                            >
                              {labels.viewTheory}
                            </Link>
                          ) : null}
                          {weekTheme.video_url ? (
                            <button
                              type="button"
                              onClick={() => setOpenVideoModality((v) => (v === weekTheme.modality ? null : weekTheme.modality))}
                              className={weekTheme.course_id ? "btn btn-secondary" : "btn btn-primary"}
                              style={{
                                fontSize: "clamp(14px, 3.5vw, 16px)",
                                minHeight: 44,
                              }}
                            >
                              {videoOpen ? labels.hideVideo : labels.viewVideo}
                            </button>
                          ) : null}
                        </div>
                      )}
                      {weekTheme.video_url && videoOpen ? (
                        <div style={{ marginTop: 12 }}>
                          <VideoPlayer url={weekTheme.video_url} title={weekTheme.title} />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {labels.noWeekTheme}
                </p>
              )}
              <Link
                href="/dashboard/tema-semana"
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  fontSize: "clamp(13px, 3.2vw, 14px)",
                  color: "var(--primary)",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                {labels.viewFullMonthLink} →
              </Link>
            </div>
          )}
          {activeTab === "mission" && (
            <div>
              {nextMission ? (
                <>
                  <p style={{ margin: "0 0 4px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {nextMission.name}
                  </p>
                  {nextMission.description && (
                    <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      {nextMission.description}
                    </p>
                  )}
                  <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--primary)", backgroundColor: "var(--primary-light)", padding: "4px 12px", borderRadius: "var(--radius-full)", display: "inline-block", marginBottom: 12 }}>
                    +{nextMission.xpReward} XP
                  </span>
                  <br />
                  <Link
                    href="/dashboard/performance"
                    style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500, textDecoration: "none" }}
                  >
                    {labels.viewAllMissions} →
                  </Link>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {labels.noMissions}
                </p>
              )}
            </div>
          )}
          {activeTab === "feedback" && (
            <div>
              {coachFeedback ? (
                <>
                  <p
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: 15,
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                      paddingLeft: 12,
                      borderLeft: "3px solid var(--primary)",
                      ...(feedbackExpanded
                        ? {}
                        : { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }),
                    }}
                  >
                    {coachFeedback.content}
                  </p>
                  {coachFeedback.content.length > 220 ? (
                    <button
                      type="button"
                      onClick={() => setFeedbackExpanded((v) => !v)}
                      style={{ border: 0, background: "none", padding: "2px 0 8px", color: "var(--primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {feedbackExpanded ? (pt ? "Ver menos" : "Show less") : pt ? "Ver mais" : "Show more"}
                    </button>
                  ) : null}
                  <p style={{ margin: 0, fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                    — {coachFeedback.coachName} · {new Date(coachFeedback.date).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <Link
                    href="/dashboard/performance"
                    style={{
                      display: "inline-block",
                      marginTop: 10,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      color: "var(--primary)",
                      fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    {labels.viewPerformanceLink} →
                  </Link>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {labels.noCoachFeedback}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
