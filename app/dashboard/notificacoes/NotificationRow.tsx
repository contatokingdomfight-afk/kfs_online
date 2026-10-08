"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useTransition } from "react";
import {
  Activity,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Flame,
  Megaphone,
  Users,
} from "lucide-react";
import { markNotificationRead } from "../notification-actions";

export type NotificationRowData = {
  id: string;
  /** `Notification.type` (PAYMENT_OVERDUE, COACH_EVALUATION, …) — escolhe o ícone. */
  type: string | null;
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

/** Ícone e cor por tipo de notificação. */
function typeVisual(type: string | null): { icon: ReactNode; bg: string; fg: string } {
  const t = type ?? "";
  if (t === "PAYMENT_RESTORED") return { icon: <CheckCircle2 size={20} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80" };
  if (t.startsWith("PAYMENT")) return { icon: <CreditCard size={20} />, bg: "rgba(251,146,60,0.16)", fg: "#fb923c" };
  if (t === "COACH_EVALUATION") return { icon: <FileText size={20} />, bg: "rgba(167,139,250,0.16)", fg: "#a78bfa" };
  if (t.startsWith("PHYSICAL_ASSESSMENT")) return { icon: <Activity size={20} />, bg: "rgba(96,165,250,0.16)", fg: "#60a5fa" };
  if (t === "PRESENCE_CONFIRMED") return { icon: <CalendarCheck size={20} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80" };
  if (t.startsWith("TRIBE")) return { icon: <Users size={20} />, bg: "rgba(248,113,113,0.16)", fg: "#f87171" };
  if (t === "REENGAGEMENT") return { icon: <Flame size={20} />, bg: "rgba(250,204,21,0.16)", fg: "#facc15" };
  if (t === "GENERAL") return { icon: <Megaphone size={20} />, bg: "rgba(193,18,31,0.16)", fg: "#f87171" };
  return { icon: <Bell size={20} />, bg: "var(--bg)", fg: "var(--text-secondary)" };
}

export function NotificationRow({ n, markReadLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const unread = !n.read_at;
  const v = typeVisual(n.type);

  const mark = () =>
    startTransition(() => {
      void markNotificationRead(n.id);
    });

  const cardStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 14px",
    textDecoration: "none",
    color: "inherit",
    borderRadius: 14,
    backgroundColor: unread ? "var(--bg-secondary)" : "transparent",
    border: `1px solid ${unread ? "var(--border)" : "transparent"}`,
    cursor: n.href ? "pointer" : "default",
  };

  const inner = (
    <>
      <span
        aria-hidden
        style={{
          width: 42,
          height: 42,
          flexShrink: 0,
          borderRadius: 21,
          backgroundColor: v.bg,
          color: v.fg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {v.icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: unread ? 800 : 600, color: "var(--text-primary)", lineHeight: 1.35 }}>
          {n.title}
        </span>
        {n.body ? (
          <span
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginTop: 3,
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.45,
            }}
          >
            {n.body}
          </span>
        ) : null}
        <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "var(--text-secondary)" }}>{n.createdAtDisplay}</span>
        {!n.href && unread ? (
          <button
            type="button"
            onClick={mark}
            disabled={pending}
            className="btn btn-secondary"
            style={{ marginTop: 10, fontSize: 13, minHeight: 36 }}
          >
            {pending ? "…" : markReadLabel}
          </button>
        ) : null}
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 4 }}>
        {unread ? (
          <span aria-label="Não lida" style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "var(--primary)" }} />
        ) : null}
        {n.href ? <ChevronRight size={18} color="var(--text-secondary)" aria-hidden /> : null}
      </span>
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
      </div>
    </li>
  );
}
