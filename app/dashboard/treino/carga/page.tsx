import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AlertTriangle, ChevronRight, Gauge, HeartPulse, Moon, ShieldCheck, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getPlanAccess } from "@/lib/plan-access";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { computeTrainingLoad, ZONE_COLORS, ZONE_LIMITS, zoneLabel, type TrainingLoadZone } from "@/lib/training-load";
import { loadTrainingSessions } from "@/lib/training-load.server";

export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

/** Escala visual do rácio: 0 → 2 (acima de 2 fica no fim). */
const SCALE_MAX = 2;
const pctOf = (v: number) => `${Math.min(100, Math.max(0, (v / SCALE_MAX) * 100))}%`;

function message(zone: TrainingLoadZone, pt: boolean): string {
  const m: Record<TrainingLoadZone, [string, string]> = {
    high: [
      "Treinaste bem mais do que o costume. Hoje prefere técnica leve ou descanso: o risco de lesão sobe quando a carga dispara.",
      "You trained much more than usual. Today go for light technique or rest: injury risk rises when load spikes.",
    ],
    caution: [
      "Estás acima do teu normal. Mantém, mas não subas mais esta semana.",
      "You're above your normal. Hold it, but don't push further this week.",
    ],
    ideal: ["Bom ritmo: estás a evoluir de forma segura.", "Good rhythm: you're progressing safely."],
    low: [
      "Treinaste menos do que o costume. Volta ao teu ritmo aos poucos, sem compensar tudo de uma vez.",
      "You trained less than usual. Ease back into your rhythm, don't make it all up at once.",
    ],
    insufficient: [
      "Precisamos de pelo menos 3 semanas de treinos com nota de esforço para comparar com o teu normal.",
      "We need at least 3 weeks of rated sessions to compare with your normal.",
    ],
  };
  return m[zone][pt ? 0 : 1];
}

function tips(zone: TrainingLoadZone, pt: boolean): { icon: ReactNode; bg: string; fg: string; text: string }[] {
  const sleep = { icon: <Moon size={20} />, bg: "rgba(96,165,250,0.16)", fg: "#60a5fa", text: pt ? "Dorme 8 h nas próximas noites" : "Sleep 8 h over the next nights" };
  const coach = { icon: <ShieldCheck size={20} />, bg: "rgba(193,18,31,0.14)", fg: "var(--primary)", text: pt ? "O teu coach também vê este alerta" : "Your coach sees this alert too" };
  if (zone === "high")
    return [sleep, { icon: <Swords size={20} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80", text: pt ? "Próxima aula: só técnica, sem sparring" : "Next class: technique only, no sparring" }, coach];
  if (zone === "caution")
    return [sleep, { icon: <HeartPulse size={20} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80", text: pt ? "Ouve o corpo: se houver dor, abranda" : "Listen to your body: ease off if it hurts" }];
  if (zone === "low")
    return [{ icon: <HeartPulse size={20} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80", text: pt ? "Marca as próximas aulas no Hoje" : "Book your next classes in Today" }];
  return [];
}

export default async function CargaPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");
  const supabase = await createClient();
  const planAccess = await getPlanAccess(supabase, studentId);
  if (!planAccess.hasCheckIn) redirect("/dashboard/treino");

  const locale = await getLocaleFromCookies();
  const pt = locale !== "en";
  const nf = (n: number) => n.toLocaleString(pt ? "pt-PT" : "en-GB");
  const ratioText = (r: number) => r.toFixed(2).replace(".", pt ? "," : ".");

  const today = calendarDateLisbon(new Date());
  const sessions = (await loadTrainingSessions(supabase, [studentId], today)).get(studentId) ?? [];
  const s = computeTrainingLoad(sessions, today);
  const color = ZONE_COLORS[s.zone];

  const maxDay = Math.max(1, ...s.days.map((d) => d.load));
  const maxWeek = Math.max(1, ...s.weeks.map((w) => w.load));
  const dow = (ymd: string) =>
    new Date(`${ymd}T12:00:00Z`).toLocaleDateString(pt ? "pt-PT" : "en-GB", { weekday: "narrow", timeZone: "UTC" });
  // Faixa «ideal» no gráfico semanal: 0,8–1,3 × a média.
  const band = s.chronic ? { from: (s.chronic * ZONE_LIMITS.low) / maxWeek, to: Math.min(1, (s.chronic * ZONE_LIMITS.ideal) / maxWeek) } : null;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      <header>
        <Link href="/dashboard/treino" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textDecoration: "none" }}>
          {pt ? "Treino" : "Training"}
        </Link>
        <h1 style={{ margin: "2px 0 0", fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800 }}>{pt ? "Carga de treino" : "Training load"}</h1>
      </header>

      {/* Estado */}
      <section style={{ ...card, padding: 18, display: "flex", flexDirection: "column", gap: 14, borderColor: s.zone === "high" || s.zone === "caution" ? color : "var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: color, color: "#111", fontSize: 13, fontWeight: 800 }}>
            {s.zone === "high" || s.zone === "caution" ? <AlertTriangle size={14} aria-hidden /> : <Gauge size={14} aria-hidden />}
            {zoneLabel(s.zone, pt)}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{pt ? "Últimos 7 dias" : "Last 7 days"}</span>
        </div>
        {s.ratio != null ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color }}>{ratioText(s.ratio)}</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{pt ? "× o teu normal" : "× your normal"}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ position: "relative", height: 12, display: "flex" }} aria-hidden>
                <span style={{ width: pctOf(ZONE_LIMITS.low), background: ZONE_COLORS.low, borderRadius: "6px 0 0 6px" }} />
                <span style={{ width: `calc(${pctOf(ZONE_LIMITS.ideal)} - ${pctOf(ZONE_LIMITS.low)})`, background: ZONE_COLORS.ideal }} />
                <span style={{ width: `calc(${pctOf(ZONE_LIMITS.caution)} - ${pctOf(ZONE_LIMITS.ideal)})`, background: ZONE_COLORS.caution }} />
                <span style={{ flex: 1, background: ZONE_COLORS.high, borderRadius: "0 6px 6px 0" }} />
                <span style={{ position: "absolute", left: `calc(${pctOf(s.ratio)} - 3px)`, top: -6, width: 6, height: 24, borderRadius: 3, background: "var(--text-primary)", boxShadow: "0 0 0 3px var(--bg-secondary)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                <span>{pt ? "Baixa" : "Low"}</span>
                <span>{pt ? "Ideal" : "Ideal"}</span>
                <span>{pt ? "Atenção" : "Caution"}</span>
                <span>{pt ? "Alta" : "High"}</span>
              </div>
            </div>
          </>
        ) : null}
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{message(s.zone, pt)}</p>
        {s.unrated7d > 0 ? (
          <Link href="/dashboard/bem-estar/rpe" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--warning)", textDecoration: "none" }}>
            {pt
              ? `${s.unrated7d} ${s.unrated7d === 1 ? "treino" : "treinos"} desta semana sem nota de esforço`
              : `${s.unrated7d} ${s.unrated7d === 1 ? "session" : "sessions"} this week without an effort rating`}
            <ChevronRight size={16} aria-hidden />
          </Link>
        ) : null}
      </section>

      {/* Números */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {[
          { v: nf(s.acute), l: pt ? "esta semana" : "this week" },
          { v: s.chronic != null ? nf(s.chronic) : "—", l: pt ? "o teu normal" : "your normal" },
          { v: String(s.sessions7d + s.unrated7d), l: pt ? "treinos" : "sessions" },
        ].map((x) => (
          <div key={x.l} style={{ ...card, borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{x.v}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{x.l}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        {/* Últimos 7 dias */}
        <section style={{ ...card, flex: "1 1 320px", minWidth: 0, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{pt ? "Últimos 7 dias" : "Last 7 days"}</h2>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{pt ? "carga por dia" : "load per day"}</span>
          </div>
          <div style={{ height: 140, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, alignItems: "end" }}>
            {s.days.map((d) => (
              <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {d.load > 0 ? <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{nf(d.load)}</span> : null}
                <span
                  title={d.trained && d.rpe == null ? (pt ? "Sem nota de esforço" : "No effort rating") : undefined}
                  style={{
                    width: "100%",
                    height: d.load > 0 ? Math.max(8, Math.round((d.load / maxDay) * 110)) : d.trained ? 8 : 4,
                    borderRadius: d.load > 0 ? "8px 8px 4px 4px" : 2,
                    background: d.load > 0 ? color : d.trained ? "transparent" : "var(--border)",
                    border: d.trained && d.load === 0 ? "2px dashed var(--warning)" : "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            {s.days.map((d, i) => (
              <span key={d.date} style={{ color: i === 6 ? "var(--text-primary)" : undefined }}>
                {dow(d.date)}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, textAlign: "center", fontSize: 11, color: "var(--text-secondary)" }}>
            {s.days.map((d) => (
              <span key={d.date}>{d.rpe != null ? `RPE ${d.rpe}` : d.trained ? "?" : "—"}</span>
            ))}
          </div>
        </section>

        {/* Tendência */}
        <section style={{ ...card, flex: "1 1 320px", minWidth: 0, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{pt ? "Tendência" : "Trend"}</h2>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{pt ? "8 semanas" : "8 weeks"}</span>
          </div>
          <div style={{ position: "relative", height: 140 }}>
            {band ? (
              <div
                aria-hidden
                style={{ position: "absolute", left: 0, right: 0, bottom: `${band.from * 100}%`, height: `${Math.max(2, (band.to - band.from) * 100)}%`, borderRadius: 6, background: "rgba(74,222,128,0.12)", border: "1px dashed rgba(74,222,128,0.6)" }}
              />
            ) : null}
            <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 10, alignItems: "end" }}>
              {s.weeks.map((w, i) => (
                <span
                  key={w.end}
                  title={nf(w.load)}
                  style={{ height: `${Math.max(3, (w.load / maxWeek) * 100)}%`, borderRadius: 6, background: i === 7 ? color : "var(--text-secondary)", opacity: i === 7 ? 1 : 0.45 }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 10, textAlign: "center", fontSize: 11, color: "var(--text-secondary)" }}>
            {s.weeks.map((w, i) => (
              <span key={w.end} style={{ fontWeight: i === 7 ? 700 : 400, color: i === 7 ? "var(--text-primary)" : undefined }}>
                {i === 7 ? (pt ? "Agora" : "Now") : `-${7 - i}`}
              </span>
            ))}
          </div>
          {band ? <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>{pt ? "Faixa verde: a tua zona ideal" : "Green band: your ideal zone"}</span> : null}
        </section>
      </div>

      {tips(s.zone, pt).length > 0 ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{pt ? "O que fazer" : "What to do"}</h2>
          {tips(s.zone, pt).map((tip) => (
            <div key={tip.text} style={{ ...card, borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <span aria-hidden style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: tip.bg, color: tip.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tip.icon}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{tip.text}</span>
            </div>
          ))}
        </section>
      ) : null}

      {/* Como funciona */}
      <section style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{pt ? "Como é calculada" : "How it's calculated"}</h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            [pt ? "Dás nota ao esforço" : "You rate the effort", pt ? "De 1 a 10, depois de cada aula" : "From 1 to 10, after each class"],
            [pt ? "Nota × minutos = carga" : "Rating × minutes = load", pt ? "Ex.: RPE 8 numa aula de 60 min = 480" : "E.g. RPE 8 in a 60-min class = 480"],
            [pt ? "Comparamos com o teu normal" : "We compare with your normal", pt ? "Últimos 7 dias ÷ média das 4 semanas antes" : "Last 7 days ÷ average of the 4 weeks before"],
          ].map(([title, hint], i) => (
            <li key={title} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span aria-hidden style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 16, background: "var(--primary)", color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i + 1}
              </span>
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{title}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>{hint}</span>
              </span>
            </li>
          ))}
        </ol>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
          {(
            [
              ["low", pt ? "< 0,8 · a perder ritmo" : "< 0.8 · losing rhythm"],
              ["ideal", pt ? "0,8–1,3 · evolução segura" : "0.8–1.3 · safe progress"],
              ["caution", pt ? "1,3–1,5 · não subas mais" : "1.3–1.5 · don't push more"],
              ["high", pt ? "> 1,5 · risco de lesão" : "> 1.5 · injury risk"],
            ] as const
          ).map(([z, text]) => (
            <span key={z} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span aria-hidden style={{ width: 22, height: 8, borderRadius: 4, background: ZONE_COLORS[z], flexShrink: 0 }} />
              <span>
                <b>{zoneLabel(z, pt)}</b> {text}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
