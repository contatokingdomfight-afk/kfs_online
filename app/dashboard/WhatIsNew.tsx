"use client";

import Link from "next/link";
import { useState } from "react";
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
  weekTheme: WeekTheme | null;
  weekThemeDays?: WeekThemeDay[];
  todayWeekday?: number;
  nextMission: Mission | null;
  coachFeedback: CoachFeedback | null;
  locale: "pt" | "en";
  labels: WhatIsNewLabels;
};

const TABS = ["theme", "mission", "feedback"] as const;

export function WhatIsNew({ weekTheme, weekThemeDays, todayWeekday, nextMission, coachFeedback, locale, labels }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("theme");
  const [videoOpen, setVideoOpen] = useState(false);

  const tabs = [
    { id: "theme" as const, label: labels.tabTheme },
    { id: "mission" as const, label: labels.tabMission },
    { id: "feedback" as const, label: labels.tabFeedback },
  ];

  return (
    <section>
      <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
        🎯 {labels.title}
      </h2>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "clamp(12px, 3vw, 16px)",
                fontSize: "clamp(13px, 3.2vw, 15px)",
                fontWeight: 500,
                background: activeTab === tab.id ? "var(--surface)" : "transparent",
                color: activeTab === tab.id ? "var(--primary)" : "var(--text-secondary)",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "clamp(16px, 4vw, 20px)" }}>
          {activeTab === "theme" && (
            <div>
              {weekTheme ? (
                <>
                  <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                    {MODALITY_LABELS[weekTheme.modality] ?? weekTheme.modality}
                  </span>
                  <p style={{ margin: "8px 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {weekTheme.title}
                  </p>
                  {weekTheme.description ? (
                    <p
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        color: "var(--text-secondary)",
                        lineHeight: 1.55,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {weekTheme.description}
                    </p>
                  ) : null}
                  {weekThemeDays && weekThemeDays.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "0 0 12px 0" }}>
                      <span style={{ fontSize: "clamp(12px, 3vw, 13px)", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {labels.weekThemeDaysSectionLabel}
                      </span>
                      {weekThemeDays.map((day) => {
                        const isToday = day.weekday === todayWeekday;
                        return (
                          <div
                            key={day.weekday}
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "baseline",
                              padding: isToday ? "6px 8px" : "2px 0",
                              borderRadius: isToday ? "var(--radius-sm, 6px)" : undefined,
                              background: isToday ? "var(--primary-light)" : undefined,
                            }}
                          >
                            <span style={{ fontSize: "clamp(13px, 3.2vw, 14px)", fontWeight: 600, color: isToday ? "var(--primary)" : "var(--text-primary)", minWidth: 36 }}>
                              {weekdayShortLabelForPublicSchedule(day.weekday, locale)}
                            </span>
                            <span style={{ fontSize: "clamp(13px, 3.2vw, 14px)", color: "var(--text-primary)" }}>
                              {day.topic}
                            </span>
                            {isToday ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>
                                {labels.weekThemeTodayBadge}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
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
                          onClick={() => setVideoOpen((v) => !v)}
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
                </>
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
                  <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {coachFeedback.content}
                  </p>
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
