"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cornerWinnerLabel } from "@/lib/arbitration/corner-labels";
import { KNOCKDOWN_OFFICIAL_DEDUCTION } from "@/lib/arbitration/occurrences";
import { decisionTypeLabel, modalityLabel } from "@/lib/arbitration/scoring";
import type { ArbitrationCorner, ArbitrationFightHistoryRow, JudgeHistoryCard } from "@/lib/arbitration/types";
import type { ArbitrationEventRow, ArbitrationJudgeRow } from "@/lib/arbitration/types";
import { DeleteArbitrationFightButton } from "@/components/arbitration/DeleteArbitrationFightButton";

type Props = {
  fights: ArbitrationFightHistoryRow[];
  events: ArbitrationEventRow[];
  judges: ArbitrationJudgeRow[];
  canDeleteFights?: boolean;
};

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

type FightKnockdownLine = {
  roundNumber: number;
  corner: "BLUE" | "RED";
  athleteName: string;
  judgeNumbers: number[];
};

function collectFightKnockdowns(
  judgeCards: JudgeHistoryCard[],
  athleteBlueName: string,
  athleteRedName: string
): FightKnockdownLine[] {
  const byKey = new Map<string, FightKnockdownLine>();

  for (const card of judgeCards) {
    for (const round of card.rounds) {
      if (round.blueKnockdown) {
        const key = `${round.roundNumber}:BLUE`;
        const existing = byKey.get(key);
        if (existing) existing.judgeNumbers.push(card.judgeNumber);
        else {
          byKey.set(key, {
            roundNumber: round.roundNumber,
            corner: "BLUE",
            athleteName: athleteBlueName,
            judgeNumbers: [card.judgeNumber],
          });
        }
      }
      if (round.redKnockdown) {
        const key = `${round.roundNumber}:RED`;
        const existing = byKey.get(key);
        if (existing) existing.judgeNumbers.push(card.judgeNumber);
        else {
          byKey.set(key, {
            roundNumber: round.roundNumber,
            corner: "RED",
            athleteName: athleteRedName,
            judgeNumbers: [card.judgeNumber],
          });
        }
      }
    }
  }

  return [...byKey.values()].sort((a, b) => a.roundNumber - b.roundNumber || a.corner.localeCompare(b.corner));
}

function formatJudgeNumbers(numbers: number[]): string {
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted.length === 1) return `juiz ${sorted[0]}`;
  return `juízes ${sorted.join(", ")}`;
}

function RoundKnockdownNote({
  round,
  athleteBlueName,
  athleteRedName,
}: {
  round: { blueKnockdown: boolean; redKnockdown: boolean };
  athleteBlueName: string;
  athleteRedName: string;
}) {
  if (!round.blueKnockdown && !round.redKnockdown) return null;

  return (
    <div className="arb-history-knockdowns">
      {round.blueKnockdown ? (
        <span className="arb-history-knockdown arb-history-knockdown-blue">
          <span className="arb-corner-blue">{athleteBlueName}</span> sofreu knockdown (−{KNOCKDOWN_OFFICIAL_DEDUCTION})
        </span>
      ) : null}
      {round.redKnockdown ? (
        <span className="arb-history-knockdown arb-history-knockdown-red">
          <span className="arb-corner-red">{athleteRedName}</span> sofreu knockdown (−{KNOCKDOWN_OFFICIAL_DEDUCTION})
        </span>
      ) : null}
    </div>
  );
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
          {fights.map((f) => {
            const knockdownLines = collectFightKnockdowns(f.judgeCards, f.athleteBlueName, f.athleteRedName);

            return (
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

              {knockdownLines.length > 0 ? (
                <div className="arb-history-knockdown-summary">
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Knockdowns
                  </div>
                  <ul className="arb-history-knockdown-list">
                    {knockdownLines.map((line) => (
                      <li key={`${line.roundNumber}-${line.corner}`}>
                        <span style={{ fontWeight: 600 }}>Round {line.roundNumber}:</span>{" "}
                        <span className={line.corner === "BLUE" ? "arb-corner-blue" : "arb-corner-red"}>
                          {line.athleteName}
                        </span>{" "}
                        (−{KNOCKDOWN_OFFICIAL_DEDUCTION}) · {formatJudgeNumbers(line.judgeNumbers)}
                      </li>
                    ))}
                  </ul>
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
                                    <RoundKnockdownNote
                                      round={r}
                                      athleteBlueName={f.athleteBlueName}
                                      athleteRedName={f.athleteRedName}
                                    />
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
            );
          })}
        </div>
      )}
    </div>
  );
}
