"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { decisionTypeLabel, modalityLabel, winnerFromTotals } from "@/lib/arbitration/scoring";
import type { ArbitrationCorner, ArbitrationFightHistoryRow } from "@/lib/arbitration/types";
import type { ArbitrationEventRow, ArbitrationJudgeRow } from "@/lib/arbitration/types";
import { DeleteArbitrationFightButton } from "@/components/arbitration/DeleteArbitrationFightButton";

type Props = {
  fights: ArbitrationFightHistoryRow[];
  events: ArbitrationEventRow[];
  judges: ArbitrationJudgeRow[];
  canDeleteFights?: boolean;
};

function cornerWinnerLabel(
  blueScore: number,
  redScore: number,
  athleteBlueName: string,
  athleteRedName: string
): string {
  const corner = winnerFromTotals(blueScore, redScore);
  if (corner === "BLUE") return athleteBlueName;
  if (corner === "RED") return athleteRedName;
  return "Empate";
}

function fightWinnerLabel(
  winner: ArbitrationCorner | null,
  athleteBlueName: string,
  athleteRedName: string
): string {
  if (winner === "BLUE") return athleteBlueName;
  if (winner === "RED") return athleteRedName;
  if (winner === "DRAW") return "Empate";
  return "—";
}

function judgeWinnerLabel(
  winner: ArbitrationCorner,
  athleteBlueName: string,
  athleteRedName: string
): string {
  return fightWinnerLabel(winner, athleteBlueName, athleteRedName);
}

export function HistoryPanel({ fights, events, judges, canDeleteFights = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventId = searchParams.get("evento") ?? "";
  const modality = searchParams.get("modalidade") ?? "";
  const date = searchParams.get("data") ?? "";
  const athlete = searchParams.get("atleta") ?? "";
  const judgeId = searchParams.get("juiz") ?? "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/coach/arbitragem/historico?${params.toString()}`);
  };

  return (
    <div>
      <div className="arb-card" style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          <select className="input" value={eventId} onChange={(e) => updateFilter("evento", e.target.value)}>
            <option value="">Todos os eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <select className="input" value={modality} onChange={(e) => updateFilter("modalidade", e.target.value)}>
            <option value="">Modalidade</option>
            <option value="BOXING">Boxe</option>
            <option value="MUAY_THAI">Muay Thai</option>
          </select>
          <input className="input" type="date" value={date} onChange={(e) => updateFilter("data", e.target.value)} />
          <input className="input" placeholder="Atleta" value={athlete} onChange={(e) => updateFilter("atleta", e.target.value)} />
          <select className="input" value={judgeId} onChange={(e) => updateFilter("juiz", e.target.value)}>
            <option value="">Juiz</option>
            {judges.map((j) => (
              <option key={j.id} value={j.id}>{j.displayName}</option>
            ))}
          </select>
        </div>
      </div>

      {fights.length === 0 ? (
        <div className="arb-empty">Nenhum combate encontrado.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {fights.map((f) => (
            <article key={f.id} className="arb-card arb-history-fight-card">
              <Link
                href={`/coach/arbitragem/${f.id}`}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {f.eventName} · {modalityLabel(f.modality)}
                </div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>
                  <span className="arb-corner-blue">{f.athleteBlueName}</span>
                  {" vs "}
                  <span className="arb-corner-red">{f.athleteRedName}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 4, color: "var(--text-secondary)" }}>
                  {f.category}{f.weightClass ? ` · ${f.weightClass}` : ""}
                </div>
              </Link>

              {f.winner ? (
                <div className="arb-history-official" style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Resultado oficial
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>
                    Vencedor: {fightWinnerLabel(f.winner, f.athleteBlueName, f.athleteRedName)}
                  </div>
                  {f.decisionType ? (
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                      {decisionTypeLabel(f.decisionType)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {f.judgeCards.length > 0 ? (
                <details className="arb-history-judges">
                  <summary className="arb-history-judges-summary">
                    <span>Cartões dos juízes ({f.judgeCards.length})</span>
                    <span className="arb-occurrences-chevron" aria-hidden>▼</span>
                  </summary>
                  <div className="arb-judge-results" style={{ marginTop: 10 }}>
                    {f.judgeCards.map((jr) => (
                      <div key={jr.judgeNumber} className="arb-summary-round">
                        <div style={{ fontWeight: 700 }}>
                          Juiz {jr.judgeNumber} — {jr.judgeName}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                          {jr.totalBlueOfficial} × {jr.totalRedOfficial}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                          Vencedor: {judgeWinnerLabel(jr.winner, f.athleteBlueName, f.athleteRedName)}
                        </div>
                        {jr.rounds.length > 0 ? (
                          <div className="arb-history-judge-rounds">
                            {jr.rounds.map((r) => (
                              <div key={r.roundNumber} className="arb-history-judge-round">
                                <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-secondary)" }}>
                                  Round {r.roundNumber}
                                </div>
                                {r.officialBlueScore != null && r.officialRedScore != null ? (
                                  <>
                                    <div style={{ fontWeight: 800, fontSize: 16, marginTop: 2 }}>
                                      {r.officialBlueScore} × {r.officialRedScore}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                                      Critérios: {r.blueTotal ?? "—"} / {r.redTotal ?? "—"}
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                      Vencedor do round:{" "}
                                      {cornerWinnerLabel(
                                        r.officialBlueScore,
                                        r.officialRedScore,
                                        f.athleteBlueName,
                                        f.athleteRedName
                                      )}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {canDeleteFights ? (
                <div className="arb-fight-card-actions">
                  <DeleteArbitrationFightButton
                    fightId={f.id}
                    label={`${f.athleteBlueName} vs ${f.athleteRedName}`}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
