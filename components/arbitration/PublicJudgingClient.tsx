"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n";
import { cornerWinnerLabel } from "@/lib/arbitration/corner-labels";
import {
  applyOfficialPointDeduction,
  emptyOccurrences,
  syncDeductionsFromOccurrences,
} from "@/lib/arbitration/occurrences";
import { modalityLabel, maxCriteriaTotal, suggestTenPointMust, sumCornerScores, winnerFromTotals } from "@/lib/arbitration/scoring";
import {
  DEFAULT_CRITERIA_SET,
  emptyDynamicScores,
  PUBLIC_CRITERIA_PRESETS_STORAGE_KEY,
  parseCriteriaSnapshot,
} from "@/lib/arbitration/criteria-sets";
import type {
  ArbitrationModality,
  ArbitrationCriterionDef,
  DynamicCornerScores,
  OccurrenceInput,
} from "@/lib/arbitration/types";
import { CriteriaRow } from "@/components/arbitration/CriteriaRow";
import { KnockdownPanel } from "@/components/arbitration/KnockdownPanel";
import { OccurrencesPanel } from "@/components/arbitration/OccurrencesPanel";

const OFFICIAL_OPTIONS = [10, 9, 8, 7];
const DEFAULT_BLUE = "Lutador 1";
const DEFAULT_RED = "Lutador 2";

type Phase = "setup" | "judging" | "done";

type RoundState = {
  roundNumber: number;
  isLocked: boolean;
  blueTotal: number | null;
  redTotal: number | null;
  officialBlueScore: number | null;
  officialRedScore: number | null;
  occurrences: OccurrenceInput;
  scores: { blue: DynamicCornerScores; red: DynamicCornerScores };
};

type PublicCriteriaPreset = {
  id: string;
  name: string;
  criteria: ArbitrationCriterionDef[];
};

function loadStoredPresets(): PublicCriteriaPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PUBLIC_CRITERIA_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;
        const name = (item as { name?: unknown }).name;
        const criteria = parseCriteriaSnapshot((item as { criteria?: unknown }).criteria);
        const id = (item as { id?: unknown }).id;
        return {
          id: typeof id === "string" ? id : `local-${index}`,
          name: typeof name === "string" && name.trim() ? name.trim() : `Perfil ${index + 1}`,
          criteria,
        };
      })
      .filter((p): p is PublicCriteriaPreset => p != null);
  } catch {
    return [];
  }
}

function emptyScores(criteria: ArbitrationCriterionDef[]): DynamicCornerScores {
  return emptyDynamicScores(criteria);
}

function emptyRounds(total: number, criteria: ArbitrationCriterionDef[]): RoundState[] {
  return Array.from({ length: total }, (_, i) => ({
    roundNumber: i + 1,
    isLocked: false,
    blueTotal: null,
    redTotal: null,
    officialBlueScore: null,
    officialRedScore: null,
    occurrences: emptyOccurrences(),
    scores: { blue: emptyScores(criteria), red: emptyScores(criteria) },
  }));
}

type Props = {
  locale: Locale;
};

export function PublicJudgingClient({ locale }: Props) {
  const t = getTranslations(locale);
  const copy = useMemo(
    () => ({
      title: locale === "pt" ? "Arbitragem de combate" : "Fight arbitration",
      subtitle:
        locale === "pt"
          ? "Arbitragem 10-Point Must para treinos e eventos informais. Sem registo — um juiz."
          : "10-Point Must arbitration for informal bouts. No sign-up — single judge.",
      backHome: t("navHome"),
      modality: locale === "pt" ? "Modalidade" : "Discipline",
      rounds: locale === "pt" ? "Rounds" : "Rounds",
      blueName: locale === "pt" ? "Cantinho azul" : "Blue corner",
      redName: locale === "pt" ? "Cantinho vermelho" : "Red corner",
      start: locale === "pt" ? "Iniciar julgamento" : "Start judging",
      saveRound: locale === "pt" ? "Salvar round" : "Save round",
      newFight: locale === "pt" ? "Novo combate" : "New bout",
      resultTitle: locale === "pt" ? "Resultado" : "Result",
      winner: locale === "pt" ? "Vencedor" : "Winner",
      draw: locale === "pt" ? "Empate" : "Draw",
      kfsCta:
        locale === "pt"
          ? "Precisa de vários juízes, histórico e eventos? Use a arbitragem na plataforma KFS."
          : "Need multiple judges, history and events? Use arbitration on the KFS platform.",
      kfsLogin: locale === "pt" ? "Entrar na plataforma" : "Sign in",
    }),
    [locale, t]
  );

  const [phase, setPhase] = useState<Phase>("setup");
  const [modality, setModality] = useState<ArbitrationModality>("BOXING");
  const [totalRounds, setTotalRounds] = useState(3);
  const [athleteBlueName, setAthleteBlueName] = useState(DEFAULT_BLUE);
  const [athleteRedName, setAthleteRedName] = useState(DEFAULT_RED);
  const [activeRound, setActiveRound] = useState(1);
  const [criteriaPresets, setCriteriaPresets] = useState<PublicCriteriaPreset[]>([DEFAULT_CRITERIA_SET]);
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_CRITERIA_SET.id);
  const criteria = useMemo(() => {
    const preset = criteriaPresets.find((p) => p.id === selectedPresetId);
    return preset?.criteria ?? DEFAULT_CRITERIA_SET.criteria;
  }, [criteriaPresets, selectedPresetId]);
  const criteriaIds = useMemo(() => criteria.map((c) => c.id), [criteria]);
  const maxTotal = useMemo(() => maxCriteriaTotal(criteria.length), [criteria.length]);
  const [rounds, setRounds] = useState<RoundState[]>(() => emptyRounds(3, DEFAULT_CRITERIA_SET.criteria));

  const [blue, setBlue] = useState<DynamicCornerScores>(emptyScores(DEFAULT_CRITERIA_SET.criteria));
  const [red, setRed] = useState<DynamicCornerScores>(emptyScores(DEFAULT_CRITERIA_SET.criteria));
  const [officialBlue, setOfficialBlue] = useState<number | null>(null);
  const [officialRed, setOfficialRed] = useState<number | null>(null);
  const [occurrences, setOccurrences] = useState<OccurrenceInput>(emptyOccurrences());
  const [error, setError] = useState<string | null>(null);

  const currentRoundState = rounds.find((r) => r.roundNumber === activeRound);
  const isLocked = currentRoundState?.isLocked ?? false;

  useEffect(() => {
    setCriteriaPresets([DEFAULT_CRITERIA_SET, ...loadStoredPresets()]);
  }, []);

  useEffect(() => {
    const rs = rounds.find((r) => r.roundNumber === activeRound);
    setBlue(rs?.scores.blue ?? emptyScores(criteria));
    setRed(rs?.scores.red ?? emptyScores(criteria));
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
    const blueName = athleteBlueName.trim() || DEFAULT_BLUE;
    const redName = athleteRedName.trim() || DEFAULT_RED;
    setAthleteBlueName(blueName);
    setAthleteRedName(redName);
    setRounds(emptyRounds(totalRounds, criteria));
    setActiveRound(1);
    setPhase("judging");
    setError(null);
  };

  const handleReset = () => {
    setPhase("setup");
    setActiveRound(1);
    setRounds(emptyRounds(totalRounds, criteria));
    setError(null);
  };

  const handleSaveRound = () => {
    if (isLocked) return;
    const bt = sumCornerScores(blue, criteriaIds);
    const rt = sumCornerScores(red, criteriaIds);
    if (bt == null || rt == null) {
      setError(locale === "pt" ? "Preencha todos os critérios (1–5)." : "Fill all criteria (1–5).");
      return;
    }
    if (baseOfficialBlue == null || baseOfficialRed == null) {
      setError(locale === "pt" ? "Defina o placar oficial do round." : "Set the official round score.");
      return;
    }

    const officialB = applyOfficialPointDeduction(baseOfficialBlue, syncedOccurrences.blueOfficialPointDeduction);
    const officialR = applyOfficialPointDeduction(baseOfficialRed, syncedOccurrences.redOfficialPointDeduction);

    setRounds((prev) =>
      prev.map((r) =>
        r.roundNumber === activeRound
          ? {
              ...r,
              isLocked: true,
              blueTotal: bt,
              redTotal: rt,
              officialBlueScore: officialB,
              officialRedScore: officialR,
              occurrences: syncedOccurrences,
              scores: { blue, red },
            }
          : r
      )
    );
    setError(null);

    if (activeRound >= totalRounds) {
      setPhase("done");
    } else {
      setActiveRound(activeRound + 1);
    }
  };

  const lockedRounds = rounds.filter((r) => r.isLocked);
  let totalBlueOfficial = 0;
  let totalRedOfficial = 0;
  for (const r of lockedRounds) {
    if (r.officialBlueScore != null) totalBlueOfficial += r.officialBlueScore;
    if (r.officialRedScore != null) totalRedOfficial += r.officialRedScore;
  }
  const fightWinner = winnerFromTotals(totalBlueOfficial, totalRedOfficial);
  const fightWinnerName =
    fightWinner === "BLUE"
      ? athleteBlueName
      : fightWinner === "RED"
        ? athleteRedName
        : copy.draw;

  return (
    <div className="arb-page arb-judging-page mx-auto max-w-3xl">
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 14 }}>
          ← {copy.backHome}
        </Link>
        <h1 className="arb-title" style={{ marginTop: 12 }}>
          {copy.title}
        </h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
          {copy.subtitle}
        </p>
      </div>

      {phase === "setup" ? (
        <div className="arb-card" style={{ display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {locale === "pt" ? "Critérios de avaliação" : "Scoring criteria"}
            </span>
            <select className="input" value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
              {criteriaPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.criteria.length})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{copy.modality}</span>
            <select className="input" value={modality} onChange={(e) => setModality(e.target.value as ArbitrationModality)}>
              <option value="BOXING">Boxe</option>
              <option value="MUAY_THAI">Muay Thai</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{copy.rounds}</span>
            <select
              className="input"
              value={totalRounds}
              onChange={(e) => setTotalRounds(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="arb-corner-blue" style={{ fontSize: 13, fontWeight: 600 }}>
              {copy.blueName}
            </span>
            <input className="input" value={athleteBlueName} onChange={(e) => setAthleteBlueName(e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="arb-corner-red" style={{ fontSize: 13, fontWeight: 600 }}>
              {copy.redName}
            </span>
            <input className="input" value={athleteRedName} onChange={(e) => setAthleteRedName(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary arb-btn-save" onClick={handleStart}>
            {copy.start}
          </button>
        </div>
      ) : null}

      {phase === "judging" ? (
        <>
          <div className="arb-judging-meta">
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {modalityLabel(modality, locale)} · {totalRounds} rounds
            </div>
          </div>

          <div className="arb-judging-sticky-bar">
            <div className="arb-scoreboard">
              <div style={{ textAlign: "center" }}>
                <div className="arb-corner-blue" style={{ fontSize: 14, marginBottom: 4 }}>
                  {athleteBlueName}
                </div>
                <div className="arb-score-total arb-corner-blue">{blueTotal ?? "—"}</div>
              </div>
              <div className="arb-score-center">
                <div className="arb-round-label">Round {activeRound}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                  de {totalRounds}
                </div>
                {displayOfficialBlue != null && displayOfficialRed != null ? (
                  <div style={{ marginTop: 8, fontWeight: 800, fontSize: 18 }}>
                    {displayOfficialBlue} × {displayOfficialRed}
                  </div>
                ) : null}
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="arb-corner-red" style={{ fontSize: 14, marginBottom: 4 }}>
                  {athleteRedName}
                </div>
                <div className="arb-score-total arb-corner-red">{redTotal ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="arb-judging-content">
            <div className="arb-card">
              <div
                className="arb-desktop-only arb-criteria-header-row"
                style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) repeat(5,1fr) repeat(5,1fr)", gap: 6, marginBottom: 8 }}
              >
                <div />
                <div className="arb-criteria-header arb-criteria-header-blue" style={{ gridColumn: "span 5" }}>
                  Azul
                </div>
                <div className="arb-criteria-header arb-criteria-header-red" style={{ gridColumn: "span 5" }}>
                  Vermelho
                </div>
              </div>
              {criteria.map((criterion) => (
                <CriteriaRow
                  key={criterion.id}
                  label={criterion.label}
                  criterionId={criterion.id}
                  blueValue={blue[criterion.id] ?? null}
                  redValue={red[criterion.id] ?? null}
                  disabled={isLocked}
                  onSelect={setScore}
                />
              ))}
            </div>

            <KnockdownPanel
              value={occurrences}
              athleteBlueName={athleteBlueName}
              athleteRedName={athleteRedName}
              disabled={isLocked}
              onChange={setOccurrences}
            />

            {suggested ? (
              <div className="arb-card" style={{ fontSize: 14 }}>
                <strong>Sugestão 10-Point Must:</strong> {suggested.blue} × {suggested.red}
              </div>
            ) : null}

            <div className="arb-card">
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Placar oficial do round</h3>
              <div className="arb-official-scores">
                <div className="arb-official-input">
                  <label className="arb-corner-blue">Azul</label>
                  <select value={baseOfficialBlue ?? ""} onChange={(e) => setOfficialBlue(Number(e.target.value))}>
                    <option value="" disabled>
                      —
                    </option>
                    {OFFICIAL_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="arb-official-input">
                  <label className="arb-corner-red">Vermelho</label>
                  <select value={baseOfficialRed ?? ""} onChange={(e) => setOfficialRed(Number(e.target.value))}>
                    <option value="" disabled>
                      —
                    </option>
                    {OFFICIAL_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <OccurrencesPanel
              key={activeRound}
              value={occurrences}
              athleteBlueName={athleteBlueName}
              athleteRedName={athleteRedName}
              disabled={isLocked}
              onChange={setOccurrences}
            />

            {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

            <div className="arb-actions">
              <button
                type="button"
                className="btn btn-primary arb-btn-save"
                disabled={blueTotal == null || redTotal == null}
                onClick={handleSaveRound}
              >
                {copy.saveRound}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {phase === "done" ? (
        <div className="arb-card">
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800 }}>{copy.resultTitle}</h2>
          {lockedRounds.map((r) => (
            <div key={r.roundNumber} className="arb-summary-round">
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-secondary)" }}>ROUND {r.roundNumber}</div>
              {r.officialBlueScore != null && r.officialRedScore != null ? (
                <div style={{ marginTop: 6, fontWeight: 800, fontSize: 20, textAlign: "center" }}>
                  {r.officialBlueScore} × {r.officialRedScore}
                </div>
              ) : null}
            </div>
          ))}
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              border: "2px solid var(--primary)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800 }}>
              {totalBlueOfficial} × {totalRedOfficial}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>
              {copy.winner}: {fightWinnerName}
            </div>
          </div>
          <button type="button" className="btn btn-primary arb-btn-save" style={{ marginTop: 16 }} onClick={handleReset}>
            {copy.newFight}
          </button>
        </div>
      ) : null}

      <div className="arb-card" style={{ marginTop: 24, fontSize: 14, color: "var(--text-secondary)" }}>
        <p style={{ margin: 0 }}>{copy.kfsCta}</p>
        <Link href="/sign-in" className="btn btn-secondary" style={{ marginTop: 12, display: "inline-block", textDecoration: "none" }}>
          {copy.kfsLogin}
        </Link>
      </div>
    </div>
  );
}
