"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useTransition } from "react";
import { markNotificationRead } from "../notification-actions";

export type NotificationRowData = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
  /** Pré-formatado no servidor (Europe/Lisbon); evita mismatch de hidratação com toLocale no cliente. */
  createdAtDisplay: string;
};

type Props = {
  n: NotificationRowData;
  markReadLabel: string;
};

export function NotificationRow({ n, markReadLabel }: Props) {
  const [pending, startTransition] = useTransition();

  const mark = () =>
    startTransition(() => {
      void markNotificationRead(n.id);
    });

  const cardStyle: CSSProperties = {
    display: "block",
    padding: "clamp(14px, 3.5vw, 18px)",
    borderLeft: n.read_at ? "3px solid transparent" : "3px solid var(--primary)",
    textDecoration: "none",
    color: "inherit",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    cursor: n.href ? "pointer" : "default",
  };

  const inner = (
    <>
      <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</p>
      {n.body && <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{n.body}</p>}
      <p style={{ margin: "8px 0 0 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)", opacity: 0.9 }}>{n.createdAtDisplay}</p>
    </>
  );

  if (n.href) {
    return (
      <li>
        <Link href={n.href} onClick={mark} className="notification-row-link" style={cardStyle}>
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div style={cardStyle} role="group">
        {inner}
        {!n.read_at && (
          <button
            type="button"
            onClick={mark}
            disabled={pending}
            className="btn btn-secondary"
            style={{ marginTop: 10, fontSize: "clamp(12px, 3vw, 14px)" }}
          >
            {pending ? "…" : markReadLabel}
          </button>
        )}
      </div>
    </li>
  );
}
