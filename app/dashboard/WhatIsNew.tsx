"use client";

import Link from "next/link";
import { useState } from "react";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

type WeekTheme = {
  modality: string;
  title: string;
  course_id: string | null;
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

type Props = {
  weekTheme: WeekTheme | null;
  nextMission: Mission | null;
  coachFeedback: CoachFeedback | null;
  locale: "pt" | "en";
  t: (key: string) => string;
};

const TABS = ["theme", "mission", "feedback"] as const;

export function WhatIsNew({ weekTheme, nextMission, coachFeedback, locale, t }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("theme");

  const tabs = [
    { id: "theme" as const, label: t("dashboardTabWeekTheme") },
    { id: "mission" as const, label: t("dashboardTabNextMission") },
    { id: "feedback" as const, label: t("dashboardTabLastFeedback") },
  ];

  return (
    <section>
      <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
        🎯 {t("dashboardWhatIsNewTitle")}
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
                  {(weekTheme.course_id || weekTheme.video_url) && (
                    weekTheme.course_id ? (
                      <Link
                        href={`/dashboard/biblioteca/${weekTheme.course_id}`}
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
                        {t("dashboardViewTheory")}
                      </Link>
                    ) : (
                      <a
                        href={weekTheme.video_url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
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
                        {t("dashboardViewVideo")}
                      </a>
                    )
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {t("dashboardNoWeekTheme")}
                </p>
              )}
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
                    {t("dashboardViewAllMissions")} →
                  </Link>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {t("dashboardNoMissions")}
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
                </>
              ) : (
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {t("dashboardNoCoachFeedback")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
