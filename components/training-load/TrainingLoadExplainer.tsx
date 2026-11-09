import { ZONE_COLORS, ZONE_LIMITS, MIN_HISTORY_DAYS, MIN_BASE_SESSIONS } from "@/lib/training-load";

/**
 * Esquema «Como é calculada a carga de treino» (session-RPE), recolhível.
 * Mesmos números de lib/training-load.ts — usado na área do aluno (RPE) e na página «Carga» do coach.
 */

const fmt = (n: number) => String(n).replace(".", ",");

const step: React.CSSProperties = {
  flex: "1 1 170px",
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--bg)",
  padding: "12px 14px",
  display: "grid",
  gap: 4,
};
const stepTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "var(--text-primary)" };
const stepText: React.CSSProperties = { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 };
const stepEx: React.CSSProperties = { fontSize: 12.5, color: "var(--text-secondary)", fontStyle: "italic" };
const arrow: React.CSSProperties = { alignSelf: "center", color: "var(--text-secondary)", fontSize: 18, flex: "0 0 auto" };

export function TrainingLoadExplainer({ pt = true, defaultOpen = false }: { pt?: boolean; defaultOpen?: boolean }) {
  const t = (a: string, b: string) => (pt ? a : b);
  // Escala da barra: rácio 0 → 2.
  const pct = (r: number) => `${(r / 2) * 100}%`;
  const zones = [
    { key: "low", from: 0, to: ZONE_LIMITS.low, label: t("Baixa", "Low") },
    { key: "ideal", from: ZONE_LIMITS.low, to: ZONE_LIMITS.ideal, label: t("Ideal", "Ideal") },
    { key: "caution", from: ZONE_LIMITS.ideal, to: ZONE_LIMITS.caution, label: t("Atenção", "Caution") },
    { key: "high", from: ZONE_LIMITS.caution, to: 2, label: t("Alta", "High") },
  ] as const;

  return (
    <details
      open={defaultOpen}
      style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg-secondary)", padding: "12px 14px", margin: "0 0 20px" }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
        {t("Como é calculada a carga de treino?", "How is training load calculated?")}
      </summary>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <div style={step}>
          <span style={stepTitle}>{t("1 · Carga do treino", "1 · Session load")}</span>
          <span style={stepText}>{t("Esforço (RPE 1–10) × minutos da aula", "Effort (RPE 1–10) × lesson minutes")}</span>
          <span style={stepEx}>{t("ex.: 7 × 60 = 420", "e.g. 7 × 60 = 420")}</span>
        </div>
        <span style={arrow} aria-hidden>→</span>
        <div style={step}>
          <span style={stepTitle}>{t("2 · Carga aguda", "2 · Acute load")}</span>
          <span style={stepText}>{t("Soma dos últimos 7 dias", "Sum of the last 7 days")}</span>
          <span style={stepEx}>{t("ex.: 4 treinos = 1 860", "e.g. 4 sessions = 1,860")}</span>
        </div>
        <span style={arrow} aria-hidden>÷</span>
        <div style={step}>
          <span style={stepTitle}>{t("3 · Carga crónica", "3 · Chronic load")}</span>
          <span style={stepText}>{t("Média por semana das semanas anteriores (até 4)", "Weekly average of the previous weeks (up to 4)")}</span>
          <span style={stepEx}>{t("ex.: 945", "e.g. 945")}</span>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 14, color: "var(--text-primary)", fontWeight: 700 }}>
        {t("Rácio = aguda ÷ crónica", "Ratio = acute ÷ chronic")}
        <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>{t(" · ex.: 1 860 ÷ 945 = 1,97", " · e.g. 1,860 ÷ 945 = 1.97")}</span>
      </div>

      <div style={{ position: "relative", marginTop: 22 }}>
        <div style={{ display: "flex", height: 30, borderRadius: 8, overflow: "hidden" }}>
          {zones.map((z) => (
            <div
              key={z.key}
              style={{
                width: pct(z.to - z.from),
                background: ZONE_COLORS[z.key],
                color: "#111",
                fontSize: 12,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {z.label}
            </div>
          ))}
        </div>
        {/* Marcador do exemplo (1,97) */}
        <div style={{ position: "absolute", top: -16, left: pct(1.97), transform: "translateX(-100%)", fontSize: 11.5, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {t("exemplo 1,97 ▾", "example 1.97 ▾")}
        </div>
        <div style={{ position: "relative", height: 16, marginTop: 4, fontSize: 11.5, color: "var(--text-secondary)" }}>
          {[ZONE_LIMITS.low, ZONE_LIMITS.ideal, ZONE_LIMITS.caution].map((v) => (
            <span key={v} style={{ position: "absolute", left: pct(v), transform: "translateX(-50%)" }}>
              {pt ? fmt(v) : String(v)}
            </span>
          ))}
        </div>
      </div>

      <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
        <li>{t("O número compara-te contigo próprio: abaixo de 0,8 treinas menos do que o costume; acima de 1,5 é uma subida brusca (mais risco de lesão e fadiga).", "It compares you with yourself: below 0.8 you train less than usual; above 1.5 is a sharp jump (higher injury and fatigue risk).")}</li>
        <li>{t("Treinos sem nota de esforço contam 0 — regista o RPE depois de cada aula.", "Sessions without an effort rating count as 0 — log your RPE after each class.")}</li>
        <li>
          {t(
            `Sem ${MIN_HISTORY_DAYS} dias de histórico ou ${MIN_BASE_SESSIONS} treinos com nota ainda não há base («sem base ainda»).`,
            `Without ${MIN_HISTORY_DAYS} days of history or ${MIN_BASE_SESSIONS} rated sessions there is no baseline yet.`
          )}
        </li>
      </ul>
    </details>
  );
}
