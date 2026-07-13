"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFightJudgingState, saveArbitrationRound, startFightJudging } from "@/app/coach/arbitragem/actions";
import {
  CRITERIA_KEYS,
  CRITERIA_LABELS_PT,
  type CornerScores,
  type CriteriaKey,
  type OccurrenceInput,
} from "@/lib/arbitration/types";
import {
  applyOfficialPointDeduction,
  countOccurrenceMarks,
  emptyOccurrences,
  occurrencesCollapsedHint,
  OCCURRENCE_FIELD_KEYS,
  OCCURRENCE_LABELS_PT,
  syncDeductionsFromOccurrences,
  type OccurrenceFieldKey,
} from "@/lib/arbitration/occurrences";
import {
  decisionTypeLabel,
  modalityLabel,
  suggestTenPointMust,
  sumCornerScores,
  winnerFromTotals,
} from "@/lib/arbitration/scoring";

type RoundState = {
  roundNumber: number;
  isLocked: boolean;
  blueTotal: number | null;
  redTotal: number | null;
  officialBlueScore: number | null;
  officialRedScore: number | null;
  occurrences?: OccurrenceInput | null;
  scores: { blue: CornerScores; red: CornerScores } | null;
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

function emptyScores(): CornerScores {
  return {
    offensiveVolume: null,
    strikePrecision: null,
    ringControl: null,
    movement: null,
    defense: null,
    technique: null,
  };
}

const OFFICIAL_OPTIONS = [10, 9, 8, 7];

export function JudgingPanel({ fightId, fightJudgeId, judgeLabel, initial }: Props) {
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

  const [blue, setBlue] = useState<CornerScores>(currentRoundState?.scores?.blue ?? emptyScores());
  const [red, setRed] = useState<CornerScores>(currentRoundState?.scores?.red ?? emptyScores());
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
    setBlue(rs?.scores?.blue ?? emptyScores());
    setRed(rs?.scores?.red ?? emptyScores());
    setOfficialBlue(rs?.officialBlueScore ?? null);
    setOfficialRed(rs?.officialRedScore ?? null);
    setOccurrences(rs?.occurrences ?? emptyOccurrences());
  }, [activeRound, rounds]);

  const syncedOccurrences = useMemo(() => syncDeductionsFromOccurrences(occurrences), [occurrences]);

  const blueTotal = useMemo(() => sumCornerScores(blue), [blue]);
  const redTotal = useMemo(() => sumCornerScores(red), [red]);

  const suggested = useMemo(() => {
    if (blueTotal == null || redTotal == null) return null;
    return suggestTenPointMust(blueTotal, redTotal);
  }, [blueTotal, redTotal]);

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
    (corner: "blue" | "red", key: CriteriaKey, value: number) => {
      if (isLocked) return;
      if (corner === "blue") setBlue((s) => ({ ...s, [key]: value }));
      else setRed((s) => ({ ...s, [key]: value }));
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
        <div className="arb-card" style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ marginBottom: 16 }}>Combate agendado — {judgeLabel}</p>
          <button type="button" className="btn btn-primary arb-btn-save" onClick={handleStart} disabled={pending}>
            Iniciar Julgamento
          </button>
          {error ? <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="arb-page arb-judging-page">
      <div className="arb-judging-sticky-bar">
        <div className="arb-judging-header">
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
        ) : null}
      </div>

      {!showSummary ? (
        <div className="arb-judging-content">
          <div className="arb-card">
            <div className="arb-desktop-only arb-criteria-header-row" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) repeat(5,1fr) repeat(5,1fr)", gap: 6, marginBottom: 8 }}>
              <div />
              <div className="arb-criteria-header arb-criteria-header-blue" style={{ gridColumn: "span 5" }}>Azul</div>
              <div className="arb-criteria-header arb-criteria-header-red" style={{ gridColumn: "span 5" }}>Vermelho</div>
            </div>

            {CRITERIA_KEYS.map((key) => (
              <CriteriaRow
                key={key}
                label={CRITERIA_LABELS_PT[key]}
                criteriaKey={key}
                blueValue={blue[key]}
                redValue={red[key]}
                disabled={isLocked || pending}
                onSelect={setScore}
              />
            ))}
          </div>

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

function CriteriaRow({
  label,
  criteriaKey,
  blueValue,
  redValue,
  disabled,
  onSelect,
}: {
  label: string;
  criteriaKey: CriteriaKey;
  blueValue: number | null;
  redValue: number | null;
  disabled: boolean;
  onSelect: (corner: "blue" | "red", key: CriteriaKey, value: number) => void;
}) {
  const scores = [1, 2, 3, 4, 5];

  return (
    <>
      <div className="arb-desktop-only arb-criteria-row">
        <div className="arb-criteria-label">{label}</div>
        {scores.map((n) => (
          <button
            key={`b-${n}`}
            type="button"
            className={`arb-score-btn arb-score-btn-blue${blueValue === n ? " arb-score-btn-selected" : ""}`}
            disabled={disabled}
            onClick={() => onSelect("blue", criteriaKey, n)}
          >
            {n}
          </button>
        ))}
        {scores.map((n) => (
          <button
            key={`r-${n}`}
            type="button"
            className={`arb-score-btn arb-score-btn-red${redValue === n ? " arb-score-btn-selected" : ""}`}
            disabled={disabled}
            onClick={() => onSelect("red", criteriaKey, n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="arb-mobile-only arb-card" style={{ padding: 12, marginBottom: 8 }}>
        <div className="arb-criteria-label" style={{ marginBottom: 10 }}>{label}</div>
        <div className="arb-corner-scores">
          <span className="arb-corner-scores-label arb-corner-blue">Azul</span>
          <div className="arb-corner-scores-btns">
            {scores.map((n) => (
              <button
                key={`mb-${n}`}
                type="button"
                className={`arb-score-btn arb-score-btn-blue${blueValue === n ? " arb-score-btn-selected" : ""}`}
                disabled={disabled}
                onClick={() => onSelect("blue", criteriaKey, n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="arb-corner-scores" style={{ marginTop: 8 }}>
          <span className="arb-corner-scores-label arb-corner-red">Verm.</span>
          <div className="arb-corner-scores-btns">
            {scores.map((n) => (
              <button
                key={`mr-${n}`}
                type="button"
                className={`arb-score-btn arb-score-btn-red${redValue === n ? " arb-score-btn-selected" : ""}`}
                disabled={disabled}
                onClick={() => onSelect("red", criteriaKey, n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const OCCURRENCE_FIELDS = OCCURRENCE_FIELD_KEYS.map((key) => ({
  key,
  label: OCCURRENCE_LABELS_PT[key],
}));

function toggleCornerOccurrence(
  value: OccurrenceInput,
  corner: "blue" | "red",
  field: OccurrenceFieldKey,
  checked: boolean
): OccurrenceInput {
  const next: OccurrenceInput = {
    ...value,
    [corner]: { ...value[corner], [field]: checked },
  };
  if (field === "pointDeduction") {
    if (corner === "blue") {
      next.blueOfficialPointDeduction = checked ? Math.max(1, value.blueOfficialPointDeduction) : 0;
    } else {
      next.redOfficialPointDeduction = checked ? Math.max(1, value.redOfficialPointDeduction) : 0;
    }
  }
  return next;
}

function OccurrencesPanel({
  value,
  athleteBlueName,
  athleteRedName,
  disabled,
  onChange,
}: {
  value: OccurrenceInput;
  athleteBlueName: string;
  athleteRedName: string;
  disabled: boolean;
  onChange: (v: OccurrenceInput) => void;
}) {
  const markCount = countOccurrenceMarks(value);
  const hint = occurrencesCollapsedHint(value);
  const hasMarks = markCount > 0 || value.notes.trim().length > 0;

  return (
    <details className="arb-card arb-occurrences-panel">
      <summary className="arb-occurrences-summary">
        <div className="arb-occurrences-summary-text">
          <span className="arb-occurrences-summary-title">Ocorrências</span>
          <span className={`arb-occurrences-summary-hint${hasMarks ? " arb-occurrences-summary-hint-active" : ""}`}>
            {hint}
          </span>
        </div>
        <span className="arb-occurrences-chevron" aria-hidden>
          ▼
        </span>
      </summary>
      <div className="arb-occurrences-body">
        <p className="arb-occurrences-intro">
          Marque o atleta a quem se aplica cada ocorrência.
        </p>
        <OccurrencesForm
          value={value}
          athleteBlueName={athleteBlueName}
          athleteRedName={athleteRedName}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    </details>
  );
}

function OccurrencesForm({
  value,
  athleteBlueName,
  athleteRedName,
  disabled,
  onChange,
}: {
  value: OccurrenceInput;
  athleteBlueName: string;
  athleteRedName: string;
  disabled: boolean;
  onChange: (v: OccurrenceInput) => void;
}) {
  const synced = syncDeductionsFromOccurrences(value);

  return (
    <>
      <div className="arb-occ-matrix-header arb-desktop-only">
        <div />
        <div className="arb-occ-matrix-corner arb-corner-blue">{athleteBlueName}</div>
        <div className="arb-occ-matrix-corner arb-corner-red">{athleteRedName}</div>
      </div>

      {OCCURRENCE_FIELDS.map(({ key, label }) => (
        <div key={key} className="arb-occ-matrix-row">
          <div className="arb-occ-matrix-label">{label}</div>
          <label className="arb-occurrence-check arb-occ-matrix-cell">
            <input
              type="checkbox"
              checked={value.blue[key]}
              disabled={disabled}
              onChange={(e) => onChange(toggleCornerOccurrence(value, "blue", key, e.target.checked))}
            />
            <span className="arb-mobile-only">Azul</span>
          </label>
          <label className="arb-occurrence-check arb-occ-matrix-cell">
            <input
              type="checkbox"
              checked={value.red[key]}
              disabled={disabled}
              onChange={(e) => onChange(toggleCornerOccurrence(value, "red", key, e.target.checked))}
            />
            <span className="arb-mobile-only">Verm.</span>
          </label>
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Desconto no placar oficial</div>
        <div className="arb-deduction-btns">
          <button
            type="button"
            className={`arb-deduction-btn arb-deduction-btn-blue${synced.blueOfficialPointDeduction > 0 ? " arb-deduction-btn-active" : ""}`}
            disabled={disabled}
            onClick={() =>
              onChange({
                ...value,
                blueOfficialPointDeduction: value.blueOfficialPointDeduction > 0 ? 0 : 1,
                blue: { ...value.blue, pointDeduction: value.blueOfficialPointDeduction > 0 ? false : true },
              })
            }
          >
            −1 {athleteBlueName}
          </button>
          <button
            type="button"
            className={`arb-deduction-btn arb-deduction-btn-red${synced.redOfficialPointDeduction > 0 ? " arb-deduction-btn-active" : ""}`}
            disabled={disabled}
            onClick={() =>
              onChange({
                ...value,
                redOfficialPointDeduction: value.redOfficialPointDeduction > 0 ? 0 : 1,
                red: { ...value.red, pointDeduction: value.redOfficialPointDeduction > 0 ? false : true },
              })
            }
          >
            −1 {athleteRedName}
          </button>
        </div>
      </div>

      <textarea
        className="input"
        placeholder="Observações…"
        rows={2}
        disabled={disabled}
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        style={{ width: "100%", marginTop: 12, minHeight: 64 }}
      />
    </>
  );
}

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
