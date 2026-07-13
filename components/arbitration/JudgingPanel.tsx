"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { saveArbitrationRound, startFightJudging } from "@/app/coach/arbitragem/actions";
import {
  CRITERIA_KEYS,
  CRITERIA_LABELS_PT,
  EMPTY_OCCURRENCES,
  type CornerScores,
  type CriteriaKey,
  type OccurrenceInput,
} from "@/lib/arbitration/types";
import {
  decisionTypeLabel,
  modalityLabel,
  suggestTenPointMust,
  sumCornerScores,
} from "@/lib/arbitration/scoring";

type RoundState = {
  roundNumber: number;
  isLocked: boolean;
  blueTotal: number | null;
  redTotal: number | null;
  officialBlueScore: number | null;
  officialRedScore: number | null;
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState(initial.activeRound);
  const [rounds, setRounds] = useState(initial.rounds);
  const [fightStatus, setFightStatus] = useState(initial.fight.status);
  const [judgeResults, setJudgeResults] = useState(initial.judgeResults);
  const [winner, setWinner] = useState(initial.fight.winner);
  const [decisionType, setDecisionType] = useState(initial.fight.decisionType);

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
  const [occurrences, setOccurrences] = useState<OccurrenceInput>(EMPTY_OCCURRENCES);

  useEffect(() => {
    const rs = rounds.find((r) => r.roundNumber === activeRound);
    setBlue(rs?.scores?.blue ?? emptyScores());
    setRed(rs?.scores?.red ?? emptyScores());
    setOfficialBlue(rs?.officialBlueScore ?? null);
    setOfficialRed(rs?.officialRedScore ?? null);
    setOccurrences(EMPTY_OCCURRENCES);
  }, [activeRound, rounds]);

  const blueTotal = useMemo(() => sumCornerScores(blue), [blue]);
  const redTotal = useMemo(() => sumCornerScores(red), [red]);

  const suggested = useMemo(() => {
    if (blueTotal == null || redTotal == null) return null;
    return suggestTenPointMust(blueTotal, redTotal);
  }, [blueTotal, redTotal]);

  const displayOfficialBlue = officialBlue ?? suggested?.blue ?? null;
  const displayOfficialRed = officialRed ?? suggested?.red ?? null;

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
            officialBlueScore: displayOfficialBlue,
            officialRedScore: displayOfficialRed,
          },
          occurrences,
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
          window.location.reload();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao guardar");
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
    <div className="arb-page">
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
        <>
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
                  value={displayOfficialBlue ?? ""}
                  disabled={isLocked || pending}
                  onChange={(e) => setOfficialBlue(Number(e.target.value))}
                >
                  <option value="" disabled>—</option>
                  {OFFICIAL_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="arb-official-input">
                <label className="arb-corner-red">Vermelho</label>
                <select
                  value={displayOfficialRed ?? ""}
                  disabled={isLocked || pending}
                  onChange={(e) => setOfficialRed(Number(e.target.value))}
                >
                  <option value="" disabled>—</option>
                  {OFFICIAL_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="arb-card">
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700 }}>Ocorrências</h3>
            <OccurrencesForm
              value={occurrences}
              disabled={isLocked || pending}
              onChange={setOccurrences}
            />
          </div>

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
        </>
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

const OCCURRENCE_FIELDS: { key: keyof OccurrenceInput; label: string }[] = [
  { key: "illegalStrike", label: "Golpe ilegal" },
  { key: "verbalWarning", label: "Advertência verbal" },
  { key: "pointDeduction", label: "Perda de ponto" },
  { key: "knockdown", label: "Knockdown" },
  { key: "count", label: "Contagem" },
  { key: "excessiveHolding", label: "Segurar excessivamente" },
  { key: "lackOfAggressiveness", label: "Falta de combatividade" },
  { key: "other", label: "Outro" },
];

function OccurrencesForm({
  value,
  disabled,
  onChange,
}: {
  value: OccurrenceInput;
  disabled: boolean;
  onChange: (v: OccurrenceInput) => void;
}) {
  return (
    <>
      <div className="arb-occurrences">
        {OCCURRENCE_FIELDS.map(({ key, label }) => (
          <label key={key} className="arb-occurrence-check">
            <input
              type="checkbox"
              checked={Boolean(value[key])}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>
      <textarea
        className="input"
        placeholder="Observações…"
        rows={2}
        disabled={disabled}
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        style={{ width: "100%", marginTop: 8, minHeight: 64 }}
      />
    </>
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
}: {
  rounds: RoundState[];
  totalRounds: number;
  athleteBlueName: string;
  athleteRedName: string;
  judgeResults: JudgeResult[];
  winner: string | null;
  decisionType: string | null;
}) {
  const lockedRounds = rounds.filter((r) => r.isLocked).sort((a, b) => a.roundNumber - b.roundNumber);

  let totalBlue = 0;
  let totalRed = 0;
  for (const r of lockedRounds) {
    if (r.officialBlueScore != null) totalBlue += r.officialBlueScore;
    if (r.officialRedScore != null) totalRed += r.officialRedScore;
  }

  const winnerName =
    winner === "BLUE" ? athleteBlueName : winner === "RED" ? athleteRedName : "Empate";

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
            <div style={{ marginTop: 6, fontWeight: 800, fontSize: 20, textAlign: "center" }}>
              {r.officialBlueScore} × {r.officialRedScore}
            </div>
          ) : null}
        </div>
      ))}

      {lockedRounds.length >= totalRounds ? (
        <>
          <div style={{ marginTop: 16, padding: 16, borderRadius: 12, border: "2px solid var(--primary)", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Resultado Oficial</div>
            <div style={{ fontSize: 32, fontWeight: 800, margin: "8px 0" }}>
              {totalBlue} × {totalRed}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Vencedor: {winnerName}</div>
            {decisionType ? (
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                {decisionTypeLabel(decisionType as "UNANIMOUS" | "SPLIT" | "MAJORITY" | "DRAW")}
              </div>
            ) : null}
          </div>

          {judgeResults.length > 0 ? (
            <div className="arb-judge-results">
              <h3 style={{ margin: "16px 0 8px", fontSize: 15 }}>Cartões dos juízes</h3>
              {judgeResults.map((jr) => (
                <div key={jr.judgeNumber} className="arb-summary-round">
                  <div style={{ fontWeight: 700 }}>Juiz {jr.judgeNumber} — {jr.judgeName}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                    {jr.totalBlueOfficial} × {jr.totalRedOfficial}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
