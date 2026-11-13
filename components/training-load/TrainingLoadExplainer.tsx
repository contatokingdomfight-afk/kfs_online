import { ZONE_COLORS, ZONE_LIMITS, MIN_HISTORY_DAYS, MIN_BASE_SESSIONS } from "@/lib/training-load";

/**
 * Esquema «Como é calculada a carga de treino» (session-RPE), recolhível.
 * Mesmos números de lib/training-load.ts — usado na área do aluno (Carga, RPE) e na página «Carga» do coach.
 * Em ecrãs estreitos (container query) a barra fica fina, sem texto, com legenda por baixo.
 */

const fmt = (n: number) => String(n).replace(".", ",");

const step: React.CSSProperties = {
  flex: "1 1 200px",
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--bg)",
  padding: "12px 14px",
  display: "grid",
  gap: 4,
  alignContent: "start",
};
const stepTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "var(--text-primary)" };
const stepText: React.CSSProperties = { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 };
const stepEx: React.CSSProperties = { fontSize: 12.5, color: "var(--text-secondary)", fontStyle: "italic" };

/** Exemplo na zona ideal: 3 treinos esta semana ÷ semana normal. */
const EX_WEEK = [420, 0, 0, 360, 0, 480, 0];
const EX_ACUTE = EX_WEEK.reduce((a, b) => a + b, 0); // 1260
const EX_CHRONIC = 1150;
const EX_RATIO = Math.round((EX_ACUTE / EX_CHRONIC) * 100) / 100; // 1,10

const CSS = `
.tle{container-type:inline-size}
.tle-bar{display:flex;height:30px;border-radius:8px;overflow:hidden}
.tle-bar>div{display:flex;align-items:center;justify-content:center;color:#111;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden}
.tle-legend{display:none;flex-wrap:wrap;gap:6px 12px;margin-top:8px;font-size:12px;color:var(--text-secondary)}
@container (max-width:520px){
  .tle-bar{height:16px}
  .tle-bar>div{font-size:0}
  .tle-legend{display:flex}
}`;

export function TrainingLoadExplainer({
  pt = true,
  defaultOpen = false,
  margin = "0 0 20px",
}: {
  pt?: boolean;
  defaultOpen?: boolean;
  margin?: string;
}) {
  const t = (a: string, b: string) => (pt ? a : b);
  const num = (n: number) => (pt ? fmt(n) : String(n));
  // Milhares com espaço (pt) ou vírgula (en), também em números de 4 algarismos.
  const nf = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, pt ? " " : ",");
  const ratioStr = pt ? EX_RATIO.toFixed(2).replace(".", ",") : EX_RATIO.toFixed(2);
  // Escala da barra: rácio 0 → 2.
  const pct = (r: number) => `${(r / 2) * 100}%`;
  const zones = [
    { key: "low", from: 0, to: ZONE_LIMITS.low, label: t("Baixa", "Low"), range: t(`até ${num(ZONE_LIMITS.low)}`, `up to ${num(ZONE_LIMITS.low)}`) },
    { key: "ideal", from: ZONE_LIMITS.low, to: ZONE_LIMITS.ideal, label: t("Ideal", "Ideal"), range: `${num(ZONE_LIMITS.low)}–${num(ZONE_LIMITS.ideal)}` },
    { key: "caution", from: ZONE_LIMITS.ideal, to: ZONE_LIMITS.caution, label: t("Atenção", "Caution"), range: `${num(ZONE_LIMITS.ideal)}–${num(ZONE_LIMITS.caution)}` },
    { key: "high", from: ZONE_LIMITS.caution, to: 2, label: t("Alta", "High"), range: t(`acima de ${num(ZONE_LIMITS.caution)}`, `above ${num(ZONE_LIMITS.caution)}`) },
  ] as const;
  const days = pt ? ["Sex", "Sáb", "Dom", "Seg", "Ter", "Qua", "Hoje"] : ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Today"];

  return (
    <details
      className="tle"
      open={defaultOpen}
      style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg-secondary)", padding: "12px 14px", margin }}
    >
      <style>{CSS}</style>
      <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
        {t("Como é calculada a carga de treino?", "How is training load calculated?")}
      </summary>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <div style={step}>
          <span style={stepTitle}>{t("1 · Carga de cada treino", "1 · Load of each session")}</span>
          <span style={stepText}>{t("Esforço que deste (RPE 1–10) × minutos da aula", "Effort you gave (RPE 1–10) × lesson minutes")}</span>
          <span style={stepEx}>{t("ex.: esforço 7 numa aula de 60 min = 420", "e.g. effort 7 in a 60-min lesson = 420")}</span>
        </div>
        <div style={step}>
          <span style={stepTitle}>{t("2 · Esta semana", "2 · This week")}</span>
          <span style={stepText}>
            {t("Soma de tudo o que treinaste ", "Sum of everything you trained ")}
            <b style={{ color: "var(--text-primary)" }}>{t("de hoje até 6 dias atrás", "from today back 6 days")}</b>
            {t(". Dias sem treino contam 0.", ". Days without training count as 0.")}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginTop: 4 }} aria-hidden>
            {EX_WEEK.map((load, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 8,
                  background: "var(--bg-secondary)",
                  border: `1px solid ${load > 0 ? ZONE_COLORS.ideal : "var(--border)"}`,
                  boxShadow: i === 6 ? "inset 0 0 0 1px var(--text-primary)" : undefined,
                  textAlign: "center",
                  padding: "6px 2px",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  minWidth: 0,
                }}
              >
                {days[i]}
                <b style={{ display: "block", fontSize: 13, color: "var(--text-primary)" }}>{load}</b>
              </div>
            ))}
          </div>
          <span style={stepEx}>{t(`ex.: 3 treinos = ${nf(EX_ACUTE)}`, `e.g. 3 sessions = ${nf(EX_ACUTE)}`)}</span>
        </div>
        <div style={step}>
          <span style={stepTitle}>{t("3 · Semana normal", "3 · Normal week")}</span>
          <span style={stepText}>
            {t(
              "Quanto costumas treinar numa semana normal (média das últimas 4 semanas, antes desta).",
              "How much you usually train in a normal week (average of the last 4 weeks, before this one)."
            )}
          </span>
          <span style={stepEx}>{t(`ex.: ${nf(EX_CHRONIC)}`, `e.g. ${nf(EX_CHRONIC)}`)}</span>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 14, color: "var(--text-primary)", fontWeight: 700 }}>
        {t("Rácio = esta semana ÷ semana normal", "Ratio = this week ÷ normal week")}
        <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>
          {` · ${t("ex.:", "e.g.")} ${nf(EX_ACUTE)} ÷ ${nf(EX_CHRONIC)} = ${ratioStr}`}
        </span>
      </div>

      <div style={{ position: "relative", paddingTop: 26, marginTop: 10 }}>
        <div className="tle-bar">
          {zones.map((z) => (
            <div key={z.key} style={{ width: pct(z.to - z.from), background: ZONE_COLORS[z.key] }}>
              {z.label}
            </div>
          ))}
        </div>
        {/* Agulha do exemplo */}
        <div style={{ position: "absolute", top: 2, left: pct(EX_RATIO), transform: "translateX(-50%)", fontSize: 11.5, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
          {t("exemplo", "example")} {ratioStr}
        </div>
        <div
          aria-hidden
          style={{ position: "absolute", top: 20, bottom: -5, left: pct(EX_RATIO), width: 3, marginLeft: -1.5, borderRadius: 2, background: "var(--text-primary)", boxShadow: "0 0 0 1px #000" }}
        >
          <span style={{ position: "absolute", left: "50%", bottom: -3, width: 9, height: 9, marginLeft: -4.5, borderRadius: "50%", background: "var(--text-primary)", boxShadow: "0 0 0 1px #000" }} />
        </div>
      </div>
      <div style={{ position: "relative", height: 16, marginTop: 4, fontSize: 11.5, color: "var(--text-secondary)" }}>
        {[ZONE_LIMITS.low, ZONE_LIMITS.ideal, ZONE_LIMITS.caution].map((v) => (
          <span key={v} style={{ position: "absolute", left: pct(v), transform: "translateX(-50%)" }}>
            {num(v)}
          </span>
        ))}
      </div>
      <div className="tle-legend">
        {zones.map((z) => (
          <span key={z.key}>
            <i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 5, verticalAlign: -1, background: ZONE_COLORS[z.key] }} />
            {z.label} · {z.range}
          </span>
        ))}
      </div>

      <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
        <li>
          {t(
            `O número compara-te contigo próprio. Entre ${num(ZONE_LIMITS.low)} e ${num(ZONE_LIMITS.ideal)} estás a treinar como de costume.`,
            `It compares you with yourself. Between ${num(ZONE_LIMITS.low)} and ${num(ZONE_LIMITS.ideal)} you are training as usual.`
          )}
        </li>
        <li>
          {t(
            `Acima de ${num(ZONE_LIMITS.caution)} é uma subida brusca: por exemplo, uma semana de ${nf(EX_CHRONIC * 2)} quando a tua semana normal é ${nf(EX_CHRONIC)} dá 2,0 (mais risco de lesão e cansaço).`,
            `Above ${num(ZONE_LIMITS.caution)} is a sharp jump: e.g. a ${nf(EX_CHRONIC * 2)} week when your normal week is ${nf(EX_CHRONIC)} gives 2.0 (higher injury and fatigue risk).`
          )}
        </li>
        <li>{t("Treinos sem nota de esforço contam 0. Regista o RPE depois de cada aula.", "Sessions without an effort rating count as 0. Log your RPE after each class.")}</li>
        <li>
          {t(
            `Precisas de ${MIN_HISTORY_DAYS} dias de histórico e ${MIN_BASE_SESSIONS} treinos com nota antes de aparecer o rácio («sem base ainda»).`,
            `You need ${MIN_HISTORY_DAYS} days of history and ${MIN_BASE_SESSIONS} rated sessions before the ratio appears ("not enough data").`
          )}
        </li>
      </ul>
    </details>
  );
}
