import { InlineInfoTip } from "@/components/ui/InlineInfoTip";

type Row = { key: string; label: string; count: number };

type Props = {
  title: string;
  rows: Row[];
  noDataLabel: string;
  infoTip?: { detail: string; ariaLabel: string };
};

export function BreakdownList({ title, rows, noDataLabel, infoTip }: Props) {
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0 }}>
      <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {title}
        {infoTip && <InlineInfoTip trigger="click" detail={infoTip.detail} ariaLabel={infoTip.ariaLabel} />}
      </h3>
      {rows.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{noDataLabel}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => {
            const pct = total > 0 ? (r.count / total) * 100 : 0;
            return (
              <div key={r.key}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-primary)" }}>{r.label}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{r.count}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, backgroundColor: "var(--border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "var(--primary)", borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
