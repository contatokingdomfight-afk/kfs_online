"use client";

import { useState } from "react";
import Link from "next/link";

const ACK_KEY = "kfs-signup-grace-ack";

function hasAcknowledged(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ACK_KEY) === "1";
  } catch {
    return false;
  }
}

type Props = {
  show: boolean;
  expiresAt: string | null;
  locale: "pt" | "en";
  body: string;
  cta: string;
  dismissLabel: string;
};

/** Aviso dispensável nas últimas 24h da carência de acesso pós-adesão (ver lib/signup-grace.ts). */
export function SignupGraceReminderBanner({ show, expiresAt, locale, body, cta, dismissLabel }: Props) {
  const [dismissed, setDismissed] = useState(hasAcknowledged);

  if (!show || !expiresAt || dismissed || hasAcknowledged()) return null;

  const formattedDeadline = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(expiresAt));

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(ACK_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-t-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-text-primary shadow-lg sm:bottom-4 sm:rounded-2xl"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <p className="m-0 flex-1">
        {body.replace("{data}", formattedDeadline)}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/dashboard/financeiro"
          className="btn btn-primary"
          style={{ textDecoration: "none", fontSize: 13, padding: "6px 12px" }}
        >
          {cta}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={dismissLabel}
          className="btn btn-secondary"
          style={{ fontSize: 13, padding: "6px 12px" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
