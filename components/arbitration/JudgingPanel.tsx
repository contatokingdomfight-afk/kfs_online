"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFightJudgingState, saveArbitrationRound, startFightJudging } from "@/app/coach/arbitragem/actions";
import {
  type DynamicCornerScores,
  type ArbitrationCriterionDef,
  type OccurrenceInput,
} from "@/lib/arbitration/types";
import {
  applyOfficialPointDeduction,
  countOccurrenceMarks,
  emptyOccurrences,
  occurrencesCollapsedHint,
  syncDeductionsFromOccurrences,
} from "@/lib/arbitration/occurrences";
import { emptyDynamicScores } from "@/lib/arbitration/criteria-sets";
import { cornerWinnerLabel } from "@/lib/arbitration/corner-labels";
import {
  decisionTypeLabel,
  maxCriteriaTotal,
  modalityLabel,
  suggestTenPointMust,
  sumCornerScores,
  winnerFromTotals,
} from "@/lib/arbitration/scoring";
import { CriteriaRow } from "@/components/arbitration/CriteriaRow";
import { KnockdownPanel } from "@/components/arbitration/KnockdownPanel";
import { OccurrencesPanel } from "@/components/arbitration/OccurrencesPanel";
import { ArbitrationCriteriaReference } from "@/components/arbitration/ArbitrationCriteriaReference";

type RoundState = {
  roundNumber: number;
  isLocked: boolean;
  blueTotal: number | null;
  redTotal: number | null;
  officialBlueScore: number | null;
  officialRedScore: number | null;
  occurrences?: OccurrenceInput | null;
  scores: { blue: DynamicCornerScores; red: DynamicCornerScores } | null;
};

type JudgeResult = {
  judgeNumber: number;
  judgeName: string;
  totalBlueOfficial: number;
  totalRedOfficial: number;
  winner: string;
};

type Props = {
  fightId: string;
  fightJudgeId: string;
  judgeLabel: string;
  initial: {
    criteria: ArbitrationCriterionDef[];
    fight: {
      id: string;
      modality: string;
      category: string;
      weightClass: string | null;
      athleteBlueName: string;
      athleteRedName: string;
      status: string;
      totalRounds: number;
      currentRound: number;
      winner: string | null;
      decisionType: string | null;
      eventName: string;
      roundDurationSeconds: number | null;
      assignedJudgeCount: number;
      completedJudgeCount: number;
    };
    activeRound: number;
    rounds: RoundState[];
    judgeResults: JudgeResult[];
  };
};

function emptyScores(criteria: ArbitrationCriterionDef[]): DynamicCornerScores {
  return emptyDynamicScores(criteria);
}

const OFFICIAL_OPTIONS = [10, 9, 8, 7];

export function JudgingPanel({ fightId, fightJudgeId, judgeLabel, initial }: Props) {
  const criteria = initial.criteria;
  const criteriaIds = useMemo(() => criteria.map((c) => c.id), [criteria]);
  const maxTotal = useMemo(() => maxCriteriaTotal(criteria.length), [criteria.length]);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState(initial.activeRound);
  const [rounds, setRounds] = useState(initial.rounds);
  const [fightStatus, setFightStatus] = useState(initial.fight.status);
  const [judgeResults, setJudgeResults] = useState(initial.judgeResults);
  const [winner, setWinner] = useState(initial.fight.winner);
  const [decisionType, setDecisionType] = useState(initial.fight.decisionType);
  const [assignedJudgeCount, setAssignedJudgeCount] = useState(initial.fight.assignedJudgeCount);
  const [completedJudgeCount, setCompletedJudgeCount] = useState(initial.fight.completedJudgeCount);

  const currentRoundState = rounds.find((r) => r.roundNumber === activeRound);
  const isLocked = currentRoundState?.isLocked ?? false;

  const [blue, setBlue] = useState<DynamicCornerScores>(
    currentRoundState?.scores?.blue ?? emptyScores(criteria)
  );
  const [red, setRed] = useState<DynamicCornerScores>(
    currentRoundState?.scores?.red ?? emptyScores(criteria)
  );
  const [officialBlue, setOfficialBlue] = useState<number | null>(
    currentRoundState?.officialBlueScore ?? null
  );
  const [officialRed, setOfficialRed] = useState<number | null>(
    currentRoundState?.officialRedScore ?? null
  );
  const [occurrences, setOccurrences] = useState<OccurrenceInput>(
    currentRoundState?.occurrences ?? emptyOccurrences()
  );

  useEffect(() => {
    const rs = rounds.find((r) => r.roundNumber === activeRound);
    setBlue(rs?.scores?.blue ?? emptyScores(criteria));
    setRed(rs?.scores?.red ?? emptyScores(criteria));
    setOfficialBlue(rs?.officialBlueScore ?? null);
    setOfficialRed(rs?.officialRedScore ?? null);
    setOccurrences(rs?.occurrences ?? emptyOccurrences());
  }, [activeRound, rounds, criteria]);

  const syncedOccurrences = useMemo(() => syncDeductionsFromOccurrences(occurrences), [occurrences]);

  const blueTotal = useMemo(() => sumCornerScores(blue, criteriaIds), [blue, criteriaIds]);
  const redTotal = useMemo(() => sumCornerScores(red, criteriaIds), [red, criteriaIds]);

  const suggested = useMemo(() => {
    if (blueTotal == null || redTotal == null) return null;
    return suggestTenPointMust(blueTotal, redTotal, maxTotal);
  }, [blueTotal, redTotal, maxTotal]);

  const baseOfficialBlue = officialBlue ?? suggested?.blue ?? null;
  const baseOfficialRed = officialRed ?? suggested?.red ?? null;

  const displayOfficialBlue =
    baseOfficialBlue != null
      ? applyOfficialPointDeduction(baseOfficialBlue, syncedOccurrences.blueOfficialPointDeduction)
      : null;
  const displayOfficialRed =
    baseOfficialRed != null
      ? applyOfficialPointDeduction(baseOfficialRed, syncedOccurrences.redOfficialPointDeduction)
      : null;

  const setScore = useCallback(
    (corner: "blue" | "red", criterionId: string, value: number) => {
      if (isLocked) return;
      if (corner === "blue") setBlue((s) => ({ ...s, [criterionId]: value }));
      else setRed((s) => ({ ...s, [criterionId]: value }));
    },
    [isLocked]
  );

  const handleStart = () => {
    startTransition(async () => {
      setError(null);
      try {
        await startFightJudging(fightId);
        setFightStatus("IN_PROGRESS");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao iniciar");
      }
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await saveArbitrationRound({
          fightId,
          fightJudgeId,
          roundNumber: activeRound,
          scores: {
            blue,
            red,
            officialBlueScore: baseOfficialBlue,
            officialRedScore: baseOfficialRed,
          },
          occurrences: syncedOccurrences,
        });

        setRounds((prev) =>
          prev.map((r) =>
            r.roundNumber === activeRound
              ? {
                  ...r,
                  isLocked: true,
                  blueTotal: result.blueTotal,
                  redTotal: result.redTotal,
                  officialBlueScore: result.officialBlue,
                  officialRedScore: result.officialRed,
                  occurrences: syncedOccurrences,
                  scores: { blue, red },
                }
              : r
          )
        );

        if (result.nextRound) {
          setActiveRound(result.nextRound);
          const hasRound = rounds.some((r) => r.roundNumber === result.nextRound);
          if (!hasRound) {
            setRounds((prev) => [
              ...prev,
              {
                roundNumber: result.nextRound!,
                isLocked: false,
                blueTotal: null,
                redTotal: null,
                officialBlueScore: null,
                officialRedScore: null,
                scores: null,
              },
            ]);
          }
        } else {
          const fresh = await getFightJudgingState(fightId, fightJudgeId);
          if (fresh) {
            setFightStatus(fresh.fight.status);
            setRounds(fresh.rounds);
            setJudgeResults(fresh.judgeResults);
            setWinner(fresh.fight.winner);
            setDecisionType(fresh.fight.decisionType);
            setAssignedJudgeCount(fresh.fight.assignedJudgeCount);
            setCompletedJudgeCount(fresh.fight.completedJudgeCount);
            setActiveRound(fresh.activeRound);
          } else {
            setFightStatus("COMPLETED");
          }
          router.refresh();
        }
      } catch (e) {
        const message =
          e instanceof Error && e.message && !e.message.includes("Server Components render")
            ? e.message
            : "Não foi possível guardar o round. Recarregue a página e verifique o resumo.";
        setError(message);
      }
    });
  };

  const allRoundsDone = rounds.filter((r) => r.isLocked).length >= initial.fight.totalRounds;
  const showSummary = fightStatus === "COMPLETED" || allRoundsDone;

  if (fightStatus === "SCHEDULED") {
    return (
      <div className="arb-page">
        <Link href="/coach/arbitragem" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14 }}>
          ← Voltar
        </Link>

        <div className="arb-card" style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-secondary)" }}>{initial.fight.eventName}</p>
          <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>
            {initial.fight.athleteBlueName} vs {initial.fight.athleteRedName}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>
            {modalityLabel(initial.fight.modality)} · {initial.fight.category}
            {initial.fight.weightClass ? ` · ${initial.fight.weightClass}` : ""} · {judgeLabel}
          </p>

          <ArbitrationCriteriaReference criteria={criteria} compact showScoringGuide />

          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="button" className="btn btn-primary arb-btn-save" onClick={handleStart} disabled={pending}>
              Iniciar Julgamento
            </button>
            <Link href="/coach/arbitragem/criterios" style={{ fontSize: 14, color: "var(--accent)" }}>
              Ver referência completa
            </Link>
          </div>
          {error ? <p style={{ color: "var(--danger)", marginTop: 12, marginBottom: 0 }}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="arb-page arb-judging-page">
      <div className="arb-judging-meta">
        <Link href="/coach/arbitragem" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14 }}>
          ← Combates
        </Link>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{initial.fight.eventName}</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {modalityLabel(initial.fight.modality)} · {initial.fight.category}
            {initial.fight.weightClass ? ` · ${initial.fight.weightClass}` : ""}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            {judgeLabel}
            {initial.fight.roundDurationSeconds
              ? ` · ${Math.floor(initial.fight.roundDurationSeconds / 60)}:${String(initial.fight.roundDurationSeconds % 60).padStart(2, "0")}`
              : ""}
          </div>
        </div>
      </div>

      {!showSummary ? (
        <div className="arb-judging-sticky-bar">
          <div className="arb-scoreboard">
            <div style={{ textAlign: "center" }}>
              <div className="arb-corner-blue" style={{ fontSize: 14, marginBottom: 4 }}>
                {initial.fight.athleteBlueName}
              </div>
              <div className="arb-score-total arb-corner-blue">{blueTotal ?? "—"}</div>
            </div>
            <div className="arb-score-center">
              <div className="arb-round-label">Round {activeRound}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                de {initial.fight.totalRounds}
              </div>
              {displayOfficialBlue != null && displayOfficialRed != null ? (
                <div style={{ marginTop: 8, fontWeight: 800, fontSize: 18 }}>
                  {displayOfficialBlue} × {displayOfficialRed}
                </div>
              ) : null}
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="arb-corner-red" style={{ fontSize: 14, marginBottom: 4 }}>
                {initial.fight.athleteRedName}
              </div>
              <div className="arb-score-total arb-corner-red">{redTotal ?? "—"}</div>
            </div>
          </div>
        </div>
      ) : null}

      {!showSummary ? (
        <div className="arb-judging-content">
          <div className="arb-card">
            <div className="arb-desktop-only arb-criteria-header-row" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) repeat(5,1fr) repeat(5,1fr)", gap: 6, marginBottom: 8 }}>
              <div />
              <div className="arb-criteria-header arb-criteria-header-blue" style={{ gridColumn: "span 5" }}>Azul</div>
              <div className="arb-criteria-header arb-criteria-header-red" style={{ gridColumn: "span 5" }}>Vermelho</div>
            </div>

            {criteria.map((criterion) => (
              <CriteriaRow
                key={criterion.id}
                label={criterion.label}
                criterionId={criterion.id}
                blueValue={blue[criterion.id] ?? null}
                redValue={red[criterion.id] ?? null}
                disabled={isLocked || pending}
                onSelect={setScore}
              />
            ))}
          </div>

          <KnockdownPanel
            value={occurrences}
            athleteBlueName={initial.fight.athleteBlueName}
            athleteRedName={initial.fight.athleteRedName}
            disabled={isLocked || pending}
            onChange={setOccurrences}
          />

          {suggested ? (
            <div className="arb-card" style={{ fontSize: 14 }}>
              <strong>Sugestão 10-Point Must:</strong> {suggested.blue} × {suggested.red}
              <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>(editável abaixo)</span>
            </div>
          ) : null}

          <div className="arb-card">
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Placar oficial do round</h3>
            <div className="arb-official-scores">
              <div className="arb-official-input">
                <label className="arb-corner-blue">Azul</label>
                <select
                  value={baseOfficialBlue ?? ""}
                  disabled={isLocked || pending}
                  onChange={(e) => setOfficialBlue(Number(e.target.value))}
                >
                  <option value="" disabled>—</option>
                  {OFFICIAL_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {syncedOccurrences.blueOfficialPointDeduction > 0 && baseOfficialBlue != null ? (
                  <span style={{ fontSize: 12, color: "var(--warning)" }}>
                    −{syncedOccurrences.blueOfficialPointDeduction} → {displayOfficialBlue}
                  </span>
                ) : null}
              </div>
              <div className="arb-official-input">
                <label className="arb-corner-red">Vermelho</label>
                <select
                  value={baseOfficialRed ?? ""}
                  disabled={isLocked || pending}
                  onChange={(e) => setOfficialRed(Number(e.target.value))}
                >
                  <option value="" disabled>—</option>
                  {OFFICIAL_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {syncedOccurrences.redOfficialPointDeduction > 0 && baseOfficialRed != null ? (
                  <span style={{ fontSize: 12, color: "var(--warning)" }}>
                    −{syncedOccurrences.redOfficialPointDeduction} → {displayOfficialRed}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <OccurrencesPanel
            key={activeRound}
            value={occurrences}
            athleteBlueName={initial.fight.athleteBlueName}
            athleteRedName={initial.fight.athleteRedName}
            disabled={isLocked || pending}
            onChange={setOccurrences}
          />

          {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

          {!isLocked ? (
            <div className="arb-actions">
              <button
                type="button"
                className="btn btn-primary arb-btn-save"
                disabled={pending || blueTotal == null || redTotal == null}
                onClick={handleSave}
              >
                {pending ? "A guardar…" : "Salvar Round"}
              </button>
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>Round {activeRound} finalizado.</p>
          )}
        </div>
      ) : null}

      {(showSummary || rounds.some((r) => r.isLocked)) && (
        <FightSummaryPanel
          rounds={rounds}
          totalRounds={initial.fight.totalRounds}
          athleteBlueName={initial.fight.athleteBlueName}
          athleteRedName={initial.fight.athleteRedName}
          judgeResults={judgeResults}
          winner={winner}
          decisionType={decisionType}
          fightStatus={fightStatus}
          assignedJudgeCount={assignedJudgeCount}
          completedJudgeCount={completedJudgeCount}
        />
      )}
    </div>
  );
}

function FightSummaryPanel({
  rounds,
  totalRounds,
  athleteBlueName,
  athleteRedName,
  judgeResults,
  winner,
  decisionType,
  fightStatus,
  assignedJudgeCount,
  completedJudgeCount,
}: {
  rounds: RoundState[];
  totalRounds: number;
  athleteBlueName: string;
  athleteRedName: string;
  judgeResults: JudgeResult[];
  winner: string | null;
  decisionType: string | null;
  fightStatus: string;
  assignedJudgeCount: number;
  completedJudgeCount: number;
}) {
  const lockedRounds = rounds.filter((r) => r.isLocked).sort((a, b) => a.roundNumber - b.roundNumber);
  const myCardComplete = lockedRounds.length >= totalRounds;
  const fightCompleted = fightStatus === "COMPLETED";
  const pendingJudges = Math.max(0, assignedJudgeCount - completedJudgeCount);

  let totalBlue = 0;
  let totalRed = 0;
  for (const r of lockedRounds) {
    if (r.officialBlueScore != null) totalBlue += r.officialBlueScore;
    if (r.officialRedScore != null) totalRed += r.officialRedScore;
  }

  const officialWinnerName =
    winner === "BLUE" ? athleteBlueName : winner === "RED" ? athleteRedName : "Empate";
  const myCardWinnerName = cornerWinnerLabel(totalBlue, totalRed, athleteBlueName, athleteRedName);

  return (
    <div className="arb-card" style={{ marginTop: 20 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800 }}>Resumo do combate</h2>

      {lockedRounds.map((r) => (
        <div key={r.roundNumber} className="arb-summary-round">
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-secondary)" }}>
            ROUND {r.roundNumber}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 15 }}>
            <span className="arb-corner-blue">Azul: {r.blueTotal ?? "—"}</span>
            <span className="arb-corner-red">Vermelho: {r.redTotal ?? "—"}</span>
          </div>
          {r.officialBlueScore != null && r.officialRedScore != null ? (
            <>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: 20, textAlign: "center" }}>
                {r.officialBlueScore} × {r.officialRedScore}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, textAlign: "center", color: "var(--text-secondary)" }}>
                Vencedor do round:{" "}
                {cornerWinnerLabel(r.officialBlueScore, r.officialRedScore, athleteBlueName, athleteRedName)}
              </div>
            </>
          ) : null}
        </div>
      ))}

      {myCardComplete && !fightCompleted ? (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>O teu cartão</div>
          <div style={{ fontSize: 28, fontWeight: 800, margin: "8px 0" }}>
            {totalBlue} × {totalRed}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Vencedor no teu cartão: {myCardWinnerName}</div>
          {pendingJudges > 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
              À espera de {pendingJudges} {pendingJudges === 1 ? "juiz" : "juízes"} para o resultado oficial.
            </div>
          ) : null}
        </div>
      ) : null}

      {judgeResults.length > 0 ? (
        <div className="arb-judge-results">
          <h3 style={{ margin: "16px 0 8px", fontSize: 15 }}>Cartões dos juízes</h3>
          {judgeResults.map((jr) => {
            const jrWinner =
              jr.winner === "BLUE"
                ? athleteBlueName
                : jr.winner === "RED"
                  ? athleteRedName
                  : "Empate";
            return (
              <div key={jr.judgeNumber} className="arb-summary-round">
                <div style={{ fontWeight: 700 }}>Juiz {jr.judgeNumber} — {jr.judgeName}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                  {jr.totalBlueOfficial} × {jr.totalRedOfficial}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                  Vencedor: {jrWinner}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {fightCompleted ? (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            border: "2px solid var(--primary)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Resultado oficial</div>
          <div style={{ fontSize: 24, fontWeight: 800, margin: "8px 0" }}>Vencedor: {officialWinnerName}</div>
          {decisionType ? (
            <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {decisionTypeLabel(decisionType as "UNANIMOUS" | "SPLIT" | "MAJORITY" | "DRAW")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
