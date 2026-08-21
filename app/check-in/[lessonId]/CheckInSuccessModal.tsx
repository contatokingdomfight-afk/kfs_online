"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  checkedInAt: string;
  locale: "pt" | "en";
  successTitle: string;
  confirmedAtTemplate: string;
  thankYou: string;
  backDashboard: string;
  postTrainingHref?: string;
  postTrainingLabel?: string;
};

export function CheckInSuccessModal({
  checkedInAt,
  locale,
  successTitle,
  confirmedAtTemplate,
  thankYou,
  backDashboard,
  postTrainingHref,
  postTrainingLabel,
}: Props) {
  const timeStr = new Date(checkedInAt).toLocaleTimeString(locale === "en" ? "en-GB" : "pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="check-in-success-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(16px, 4vw, 24px)",
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
          padding: "clamp(24px, 6vw, 32px)",
          boxSizing: "border-box",
        }}
      >
        <h2
          id="check-in-success-title"
          className="text-mobile-lg"
          style={{ color: "var(--success)", margin: "0 0 clamp(12px, 3vw, 16px) 0" }}
        >
          {successTitle}
        </h2>
        <p className="text-mobile-base" style={{ color: "var(--text-secondary)", margin: "0 0 8px 0" }}>
          {confirmedAtTemplate.replace("{time}", timeStr)}
        </p>
        <p className="text-mobile-sm" style={{ color: "var(--text-secondary)", margin: "0 0 clamp(20px, 5vw, 24px) 0" }}>
          {thankYou}
        </p>
        {postTrainingHref && postTrainingLabel ? (
          <Link
            href={postTrainingHref}
            className="btn btn-secondary"
            style={{ display: "inline-block", width: "100%", maxWidth: 280, marginBottom: 12 }}
          >
            {postTrainingLabel}
          </Link>
        ) : null}
        <Link
          href="/dashboard"
          className="btn btn-primary"
          style={{ display: "inline-block", width: "100%", maxWidth: 280 }}
          autoFocus
        >
          {backDashboard}
        </Link>
      </div>
    </div>
  );
}
