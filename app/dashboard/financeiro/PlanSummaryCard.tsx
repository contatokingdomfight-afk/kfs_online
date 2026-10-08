import { BookOpen, CalendarCheck, Gift, LineChart, CheckCircle2, Clock, Sparkles } from "lucide-react";

export type PlanSummary = {
  name: string;
  /** Ex.: «€45/mês»; null para membro de plano família. */
  priceLabel: string | null;
  /** Linha extra (ex.: «Membro do plano família»). */
  note?: string | null;
  modalities: string[];
  checkIns: { enabled: boolean; used: number; limit: number | null; perDayLimit: 0 | 1 | null };
  includes: { digital: boolean; performance: boolean; benefits: boolean };
  /** Estado da mensalidade mais recente. */
  payment: { tone: "ok" | "pending" | "none"; label: string };
};

function IncludeRow({ on, icon, label }: { on: boolean; icon: React.ReactNode; label: string }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        backgroundColor: "var(--bg)",
        border: "1px solid var(--border)",
        opacity: on ? 1 : 0.55,
      }}
    >
      <span aria-hidden style={{ color: on ? "var(--primary)" : "var(--text-secondary)", display: "inline-flex" }}>
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: on ? "var(--success)" : "var(--text-secondary)" }}>
        {on ? "✓" : "—"}
      </span>
    </li>
  );
}

/** Cartão «O meu plano» no topo de «Plano e pagamentos». */
export function PlanSummaryCard({ plan, locale }: { plan: PlanSummary; locale: "pt" | "en" }) {
  const pt = locale === "pt";
  const { checkIns } = plan;
  const pct =
    checkIns.limit && checkIns.limit > 0 ? Math.min(100, Math.round((checkIns.used / checkIns.limit) * 100)) : 0;
  const paymentColor =
    plan.payment.tone === "ok" ? "var(--success)" : plan.payment.tone === "pending" ? "var(--warning)" : "var(--text-secondary)";

  return (
    <section
      aria-labelledby="my-plan-title"
      className="rounded-2xl bg-bg-secondary border border-border shadow-md"
      style={{ padding: "clamp(16px, 4vw, 22px)", display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span
          aria-hidden
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: 14,
            backgroundColor: "var(--primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={24} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            {pt ? "O meu plano" : "My plan"}
          </p>
          <h2 id="my-plan-title" style={{ margin: "2px 0 0", fontSize: "clamp(19px, 4.8vw, 22px)", fontWeight: 800 }}>
            {plan.name}
          </h2>
          {(plan.priceLabel || plan.note) && (
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
              {[plan.priceLabel, plan.note].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            fontSize: 12,
            fontWeight: 700,
            color: paymentColor,
            whiteSpace: "nowrap",
          }}
        >
          {plan.payment.tone === "ok" ? <CheckCircle2 size={14} aria-hidden /> : <Clock size={14} aria-hidden />}
          {plan.payment.label}
        </span>
      </div>

      {plan.modalities.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {plan.modalities.map((m) => (
            <span
              key={m}
              style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: "var(--bg)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 600 }}
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {checkIns.enabled && (
        <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarCheck size={20} color="var(--primary)" aria-hidden />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{pt ? "Aulas este mês" : "Classes this month"}</span>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {checkIns.limit != null ? `${checkIns.used} / ${checkIns.limit}` : `${checkIns.used} · ${pt ? "sem limite" : "no limit"}`}
            </span>
          </div>
          {checkIns.limit != null && (
            <div style={{ marginTop: 10, height: 8, borderRadius: 4, backgroundColor: "var(--border)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", backgroundColor: pct >= 100 ? "var(--warning)" : "var(--primary)" }} />
            </div>
          )}
          {checkIns.perDayLimit === 1 && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
              {pt ? "Máximo de 1 aula por dia." : "Up to 1 class per day."}
            </p>
          )}
        </div>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: 8 }}>
        <IncludeRow on={plan.includes.digital} icon={<BookOpen size={18} />} label={pt ? "Biblioteca digital" : "Digital library"} />
        <IncludeRow on={plan.includes.performance} icon={<LineChart size={18} />} label={pt ? "Perfil de atleta" : "Athlete profile"} />
        <IncludeRow on={plan.includes.benefits} icon={<Gift size={18} />} label={pt ? "Benefícios exclusivos" : "Exclusive benefits"} />
      </ul>
    </section>
  );
}
