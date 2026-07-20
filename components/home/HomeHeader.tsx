"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  ctaLabel: string;
  timerLabel: string;
  judgingLabel: string;
  navHowItWorksLabel: string;
  navPlansLabel: string;
  navScheduleLabel: string;
  navFaqLabel: string;
  navAboutLabel: string;
  navMenuLabel: string;
  navMenuCloseLabel: string;
  navAriaLabel: string;
};

const navLinkClass =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]";

const mobileLinkClass =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]";

export function HomeHeader({
  ctaLabel,
  timerLabel,
  judgingLabel,
  navHowItWorksLabel,
  navPlansLabel,
  navScheduleLabel,
  navFaqLabel,
  navAboutLabel,
  navMenuLabel,
  navMenuCloseLabel,
  navAriaLabel,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const sectionLinks = [
    { href: "#como-funciona", label: navHowItWorksLabel },
    { href: "#plans", label: navPlansLabel },
    { href: "#horarios", label: navScheduleLabel },
    { href: "#faq", label: navFaqLabel },
    { href: "#sobre", label: navAboutLabel },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:pr-[max(72px,env(safe-area-inset-right))]">
        <span className="truncate text-lg font-bold text-[var(--text-primary)]">
          Kingdom Fight School
        </span>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label={navAriaLabel}>
          {sectionLinks.map((item) => (
            <a key={item.href} href={item.href} className={navLinkClass}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-1 lg:flex lg:gap-2">
          <Link href="/timer" className={navLinkClass}>
            <span aria-hidden>⏱️</span>
            <span>{timerLabel}</span>
          </Link>
          <Link href="/arbitragem" className={navLinkClass}>
            <span aria-hidden>🏆</span>
            <span>{judgingLabel}</span>
          </Link>
          <Link
            href="/aula-experimental"
            className="btn btn-primary px-4 py-2.5 text-sm font-semibold"
          >
            {ctaLabel}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? navMenuCloseLabel : navMenuLabel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-[var(--text-primary)] lg:hidden"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <nav
          className="flex flex-col gap-1 border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3 lg:hidden"
          aria-label={navAriaLabel}
        >
          {sectionLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={mobileLinkClass}
            >
              {item.label}
            </a>
          ))}
          <div className="my-1 border-t border-[var(--border)]" />
          <Link href="/timer" onClick={() => setMenuOpen(false)} className={mobileLinkClass}>
            <span aria-hidden>⏱️</span>
            <span>{timerLabel}</span>
          </Link>
          <Link href="/arbitragem" onClick={() => setMenuOpen(false)} className={mobileLinkClass}>
            <span aria-hidden>🏆</span>
            <span>{judgingLabel}</span>
          </Link>
          <Link
            href="/aula-experimental"
            onClick={() => setMenuOpen(false)}
            className="btn btn-primary mt-2 justify-center px-4 py-2.5 text-sm font-semibold"
          >
            {ctaLabel}
          </Link>
        </nav>
      )}
    </header>
  );
}
