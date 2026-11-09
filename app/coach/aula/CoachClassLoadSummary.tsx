"use client";

import { useState } from "react";
import type { CoachLessonStudentRow } from "@/lib/coach-lesson-eligible-students";
import { ZONE_COLORS, zoneForRatio, zoneLabel, type TrainingLoadZone } from "@/lib/training-load";

type Scope = "all" | "going" | "present";

const ORDER: TrainingLoadZone[] = ["high", "caution", "ideal", "low", "insufficient"];

/** Resumo da carga de treino da aula: todos os elegíveis, quem marcou «Vou» ou quem já fez check-in. */
export function CoachClassLoadSummary({ students }: { students: CoachLessonStudentRow[] }) {
  const [scope, setScope] = useState<Scope>("present");
  const inScope = (s: CoachLessonStudentRow) =>
    scope === "all" ? true : scope === "going" ? s.status === "PENDING" || s.status === "CONFIRMED" : s.status === "CONFIRMED";
  const list = students.filter((s) => s.trainingLoad && inScope(s));
  const counts = new Map<TrainingLoadZone, number>();
  for (const s of list) counts.set(s.trainingLoad!.zone, (counts.get(s.trainingLoad!.zone) ?? 0) + 1);
  const total = list.length;
  const atRisk = list
    .filter((s) => s.trainingLoad!.zone === "high" || s.trainingLoad!.zone === "caution")
    .sort((a, b) => (b.trainingLoad!.ratio ?? 0) - (a.trainingLoad!.ratio ?? 0));

  const withBase = list.filter((s) => s.trainingLoad!.ratio != null);
  const avgRatio = withBase.length
    ? Math.round((withBase.reduce((t, s) => t + s.trainingLoad!.ratio!, 0) / withBase.length) * 100) / 100
    : null;
  const avgZone = zoneForRatio(avgRatio);

  const tabs: { key: Scope; label: string; n: number }[] = [
    { key: "all", label: "Todos", n: students.filter((s) => s.trainingLoad).length },
    { key: "going", label: "Vou", n: students.filter((s) => s.trainingLoad && (s.status === "PENDING" || s.status === "CONFIRMED")).length },
    { key: "present", label: "Presentes", n: students.filter((s) => s.trainingLoad && s.status === "CONFIRMED").length },
  ];

  return (
    <section className="card" style={{ padding: 14, marginBottom: 14, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15 }}>Carga da turma</strong>
        <div role="tablist" aria-label="Que alunos contar" style={{ display: "flex", gap: 4, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={scope === t.key}
              onClick={() => setScope(t.key)}
              style={{
                border: 0,
                borderRadius: 8,
                padding: "6px 10px",
                font: "inherit",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                background: scope === t.key ? "var(--primary)" : "transparent",
                color: scope === t.key ? "#fff" : "var(--text-secondary)",
              }}
            >
              {t.label} · {t.n}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
          {scope === "present" ? "Ainda ninguém fez check-in nesta aula." : scope === "going" ? "Ainda ninguém marcou «Vou»." : "Sem alunos elegíveis."}
        </p>
      ) : (
        <>
          {/* Média do rácio só de quem tem base (os «sem base ainda» ficam de fora). Uma linha, sem caixa. */}
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            Média
            {avgRatio != null ? (
              <>
                <strong style={{ fontSize: 18, color: ZONE_COLORS[avgZone] }}>{avgRatio.toFixed(1).replace(".", ",")}</strong>
                <span style={{ color: ZONE_COLORS[avgZone], fontWeight: 700 }}>{zoneLabel(avgZone, true)}</span>
                <span>· {withBase.length} de {total} com base</span>
              </>
            ) : (
              <span>— · ninguém com base ainda</span>
            )}
          </p>
          <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "var(--bg)" }} aria-hidden>
            {ORDER.map((z) => {
              const n = counts.get(z) ?? 0;
              return n ? <div key={z} style={{ width: `${(n / total) * 100}%`, background: ZONE_COLORS[z] }} /> : null;
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", fontSize: 13 }}>
            {ORDER.filter((z) => counts.get(z)).map((z) => (
              <span key={z} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 5, background: ZONE_COLORS[z], display: "inline-block" }} aria-hidden />
                {zoneLabel(z, true)} <strong style={{ color: "var(--text-primary)" }}>{counts.get(z) ?? 0}</strong>
              </span>
            ))}
          </div>
          {atRisk.length > 0 ? (
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>
              ⚠️ Atenção à intensidade:{" "}
              {atRisk.map((s, i) => (
                <span key={s.studentId}>
                  {i > 0 ? ", " : ""}
                  {s.name ?? s.email}
                  <span style={{ color: ZONE_COLORS[s.trainingLoad!.zone], fontWeight: 700 }}>
                    {s.trainingLoad!.ratio != null ? ` ${s.trainingLoad!.ratio.toFixed(1).replace(".", ",")}` : ""}
                  </span>
                </span>
              ))}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Ninguém em carga alta ou em atenção.</p>
          )}
        </>
      )}
    </section>
  );
}
