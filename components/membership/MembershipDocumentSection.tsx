"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

function StatusBadge({
  ok,
  okLabel,
  pendingLabel,
}: {
  ok: boolean;
  okLabel: string;
  pendingLabel: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: ok ? "color-mix(in srgb, #16a34a 15%, transparent)" : "color-mix(in srgb, var(--danger) 12%, transparent)",
        color: ok ? "#16a34a" : "var(--danger)",
      }}
    >
      {ok ? okLabel : pendingLabel}
    </span>
  );
}

type Props = {
  title: string;
  ok: boolean;
  okLabel: string;
  pendingLabel: string;
  /** Resumo visível mesmo com a secção fechada (ex.: data de assinatura). */
  summary?: ReactNode;
  /** Link para a página de impressão dedicada — botão sempre visível quando definido. */
  printHref?: string;
  printLabel?: string;
  /** Mensagem quando o documento ainda não existe / não foi preenchido. */
  pendingMessage?: ReactNode;
  children?: ReactNode;
  defaultExpanded?: boolean;
};

/** Cartão colapsável para comprovativo, condições gerais ou termo — imprimir fica sempre à direita. */
export function MembershipDocumentSection({
  title,
  ok,
  okLabel,
  pendingLabel,
  summary,
  printHref,
  printLabel = "Imprimir",
  pendingMessage,
  children,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const canExpand = ok && Boolean(children);

  return (
    <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              flex: "1 1 180px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              padding: 0,
              border: "none",
              background: "none",
              color: "var(--text-primary)",
              fontSize: 18,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                display: "inline-block",
                width: 16,
                fontSize: 12,
                color: "var(--text-secondary)",
                transform: expanded ? "rotate(90deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            >
              ▶
            </span>
            <span style={{ minWidth: 0 }}>{title}</span>
          </button>
        ) : (
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, flex: "1 1 180px", minWidth: 0 }}>{title}</h2>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <StatusBadge ok={ok} okLabel={okLabel} pendingLabel={pendingLabel} />
          {printHref && ok ? (
            <Link
              href={printHref}
              className="btn btn-secondary"
              style={{ textDecoration: "none", fontSize: 13, whiteSpace: "nowrap" }}
              onClick={(e) => e.stopPropagation()}
            >
              {printLabel}
            </Link>
          ) : null}
        </div>
      </div>

      {summary ? (
        <div style={{ marginTop: 10, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{summary}</div>
      ) : null}

      {!ok && pendingMessage ? (
        <p style={{ margin: summary ? "8px 0 0" : "10px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
          {pendingMessage}
        </p>
      ) : null}

      {canExpand && expanded ? <div style={{ marginTop: 16 }}>{children}</div> : null}
    </section>
  );
}
