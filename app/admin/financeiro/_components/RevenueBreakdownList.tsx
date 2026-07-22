"use client";

import { deleteManualRevenue } from "../actions";

export type RevenueBreakdownListRow = {
  key: string;
  categoryTag: string;
  title: string;
  amount: number;
  isManual: boolean;
};

type Props = {
  rows: RevenueBreakdownListRow[];
  total: number;
  totalLabel: string;
  deleteLabel: string;
  locale: "pt" | "en";
};

function formatMoney(n: number, locale: "pt" | "en") {
  return n.toLocaleString(locale === "en" ? "en-GB" : "pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}

const chipStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: 999,
  backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
  color: "var(--accent)",
  lineHeight: 1.35,
  maxWidth: "100%",
};

export function RevenueBreakdownList({ rows, total, totalLabel, deleteLabel, locale }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row) => (
          <li
            key={row.key}
            className="card"
            style={{
              padding: "clamp(12px, 3vw, 14px)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    ...chipStyle,
                    display: "inline-block",
                    marginBottom: row.title ? 6 : 0,
                  }}
                >
                  {row.categoryTag}
                </span>
                {row.title ? (
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      fontSize: "clamp(14px, 3.5vw, 15px)",
                      color: "var(--text-primary)",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {row.title}
                  </p>
                ) : null}
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "clamp(15px, 3.8vw, 16px)",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatMoney(row.amount, locale)}
              </span>
            </div>

            {row.isManual ? (
              <form action={deleteManualRevenue} style={{ margin: "10px 0 0" }}>
                <input type="hidden" name="id" value={row.key.replace(/^manual:/, "")} />
                <button
                  type="submit"
                  className="btn"
                  style={{
                    fontSize: 13,
                    padding: "6px 14px",
                    width: "100%",
                    minHeight: 40,
                  }}
                >
                  {deleteLabel}
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      {rows.length > 0 ? (
        <div
          className="card"
          style={{
            padding: "clamp(14px, 3.5vw, 16px)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{totalLabel}</span>
          <span
            style={{
              fontWeight: 800,
              fontSize: "clamp(16px, 4vw, 18px)",
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatMoney(total, locale)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
