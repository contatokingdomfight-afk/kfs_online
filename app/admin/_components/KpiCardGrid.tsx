"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";

/** icon já resolvido como elemento pelo chamador (Server Component) — ver nota em Sidebar.tsx sobre a fronteira Server/Client. */
/** Tendência face ao período anterior; tone diz se a evolução é boa ou má (não se subiu ou desceu). */
type Trend = { text: string; tone: "good" | "bad" | "neutral" };
type Card = { href: string; icon: ReactNode; value: string; label: string; info?: string; trend?: Trend };

const TREND_COLOR: Record<Trend["tone"], string> = { good: "var(--success)", bad: "var(--danger)", neutral: "var(--text-secondary)" };

type Props = { cards: Card[] };

export function KpiCardGrid({ cards }: Props) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "clamp(10px, 2.5vw, 16px)",
      }}
    >
      {cards.map((c) => (
        <Link
          key={c.href + c.label}
          href={c.href}
          className="card"
          style={{
            padding: "clamp(14px, 3.5vw, 20px)",
            minWidth: 0,
            textDecoration: "none",
            color: "inherit",
            display: "block",
            position: "relative",
          }}
        >
          {c.info && (
            <span
              style={{ position: "absolute", top: "clamp(10px, 2.5vw, 14px)", right: "clamp(10px, 2.5vw, 14px)" }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <InlineInfoTip trigger="click" detail={c.info} ariaLabel={c.label} />
            </span>
          )}
          <span style={{ marginBottom: 8, display: "block", color: "var(--primary)" }} aria-hidden>
            {c.icon}
          </span>
          <div style={{ fontSize: "clamp(18px, 4.5vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
            {c.value}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{c.label}</div>
          {c.trend ? <div style={{ fontSize: 12, fontWeight: 700, color: TREND_COLOR[c.trend.tone], marginTop: 4 }}>{c.trend.text}</div> : null}
        </Link>
      ))}
    </section>
  );
}
