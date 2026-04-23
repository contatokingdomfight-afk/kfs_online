"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n";
import {
  applyPhaseEnd,
  catchUp,
  formatMmSsFromMs,
  initialState,
  nextRoundDisplay1Based,
  parseSession,
  pauseState,
  remainingMs,
  resetState,
  resumeState,
  serializeSession,
  startFromIdle,
  uiKind,
  clampConfig,
} from "@/lib/round-timer/engine";
import type { RoundTimerState, TimerConfig, TimerPhase } from "@/lib/round-timer/types";
import {
  BUILT_IN_PRESETS,
  loadCustomPresets,
  loadSessionSnapshot,
  loadStoredConfig,
  saveCustomPresets,
  saveSessionSnapshot,
  saveStoredConfig,
  type SavedPreset,
} from "@/lib/round-timer/persistence";
import {
  playBeepCountdownTick,
  playBeepEndOfRound,
  playBeepFinish,
  playBeepRound,
  playBeepTenSecondsWarning,
  unlockAudio,
} from "@/lib/round-timer/audio";
import { DurationRollPicker } from "@/components/coach/round-timer/DurationRollPicker";
import "@/app/coach/round-timer/round-timer.css";

function vibrateMs(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* */
  }
}

type Props = { locale: Locale };

export function RoundTimerClient({ locale }: Props) {
  const t = getTranslations(locale);
  const tk = useMemo(
    () => ({
      title: t("coachRoundTimerTitle"),
      back: t("coachRoundTimerBack"),
      configTitle: t("coachRoundTimerConfigTitle"),
      rounds: t("coachRoundTimerRounds"),
      roundTime: t("coachRoundTimerRoundTime"),
      restTime: t("coachRoundTimerRestTime"),
      countdown: t("coachRoundTimerCountdown"),
      presetLabel: t("coachRoundTimerPresetLabel"),
      savePreset: t("coachRoundTimerSavePreset"),
      start: t("coachRoundTimerStart"),
      pause: t("coachRoundTimerPause"),
      resume: t("coachRoundTimerResume"),
      reset: t("coachRoundTimerReset"),
      fullscreen: t("coachRoundTimerFullscreen"),
      exitFs: t("coachRoundTimerExitFullscreen"),
      statePrepare: t("coachRoundTimerStatePrepare"),
      stateRound: t("coachRoundTimerStateRound"),
      stateRest: t("coachRoundTimerStateRest"),
      stateDone: t("coachRoundTimerStateDone"),
      statePaused: t("coachRoundTimerStatePaused"),
      roundOf: t("coachRoundTimerRoundOf"),
      nextRound: t("coachRoundTimerNextRound"),
      maximizeView: t("coachRoundTimerMaximizeView"),
      minimizeView: t("coachRoundTimerMinimizeView"),
      sec: t("coachRoundTimerSec"),
      min: t("coachRoundTimerMin"),
      ariaMin: t("coachRoundTimerAriaMinutes"),
      ariaSec: t("coachRoundTimerAriaSeconds"),
    }),
    [t]
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<TimerConfig>(() => loadStoredConfig());
  const [timer, setTimer] = useState<RoundTimerState>(() => initialState(loadStoredConfig()));
  const [displayMs, setDisplayMs] = useState(0);
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [timerViewExpanded, setTimerViewExpanded] = useState(true);
  const prevPhase = useRef(timer.phase);
  const lastCountdownSec = useRef<number | null>(null);
  const prevRemForTenSec = useRef<number | null>(null);
  const tenSecPhaseKey = `${timer.phase}-${timer.roundIdx}-${timer.completedRoundIdx}`;

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(typeof document !== "undefined" && !!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* Hidratar sessão (refresh / voltar ao separador) */
  useEffect(() => {
    const raw = loadSessionSnapshot();
    const parsed = parseSession(raw);
    if (!parsed?.config || !parsed.phase || parsed.phase === "idle" || parsed.phase === "finished") return;
    let s: RoundTimerState = {
      ...initialState(clampConfig(parsed.config)),
      ...parsed,
      config: clampConfig(parsed.config),
    } as RoundTimerState;
    s = catchUp(s, Date.now());
    setTimer(s);
    setConfig(s.config);
  }, []);

  /* Persistir sessão ativa */
  useEffect(() => {
    saveSessionSnapshot(serializeSession(timer));
  }, [timer]);

  /* Guardar config quando editável */
  useEffect(() => {
    if (timer.phase === "idle" || timer.phase === "finished") {
      saveStoredConfig(config);
    }
  }, [config, timer.phase]);

  /* Tick + background-safe */
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setTimer((s) => {
        if (s.phase === "idle" || s.phase === "finished" || s.phase === "paused") return s;
        if (s.phaseEndsAt == null) return s;
        if (s.phaseEndsAt > now) return s;
        return catchUp(s, now);
      });
    };
    const id = window.setInterval(tick, 200);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        setTimer((s) => catchUp(s, now));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  /* Display ms derivado */
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      if (timer.phase === "paused" && timer.paused) {
        setDisplayMs(timer.paused.remainingMs);
        return;
      }
      if (timer.phaseEndsAt != null && timer.phase !== "idle" && timer.phase !== "finished") {
        setDisplayMs(remainingMs(timer.phaseEndsAt, now));
      } else {
        setDisplayMs(0);
      }
    };
    update();
    const id = window.setInterval(update, 100);
    return () => window.clearInterval(id);
  }, [timer]);

  /* Sons + vibração nas transições de fase */
  useEffect(() => {
    const was = prevPhase.current;
    const is = timer.phase;
    prevPhase.current = is;
    if (was === is) return;

    void unlockAudio();

    if (is === "round" && (was === "countdown" || was === "rest")) {
      playBeepRound();
      vibrateMs(120);
    } else if (is === "rest" && was === "round") {
      playBeepEndOfRound();
      vibrateMs(80);
    } else if (is === "finished" && was === "round") {
      playBeepFinish();
      vibrateMs([100, 80, 100]);
    }
  }, [timer.phase]);

  /* Beep nos últimos 3s do countdown */
  useEffect(() => {
    if (timer.phase !== "countdown" || timer.phaseEndsAt == null) {
      lastCountdownSec.current = null;
      return;
    }
    const sec = Math.ceil(remainingMs(timer.phaseEndsAt, Date.now()) / 1000);
    if (sec <= 3 && sec >= 1 && lastCountdownSec.current !== sec) {
      lastCountdownSec.current = sec;
      void unlockAudio();
      playBeepCountdownTick();
    }
    if (sec > 3) lastCountdownSec.current = null;
  }, [timer.phase, timer.phaseEndsAt, displayMs]);

  /* Aviso quando o tempo restante cruza para os últimos 10 s (ignora rounds/descansos já curtos desde o início) */
  useEffect(() => {
    prevRemForTenSec.current = null;
  }, [tenSecPhaseKey]);

  useEffect(() => {
    if (timer.phase !== "round" && timer.phase !== "rest") return;
    if (timer.phaseEndsAt == null) return;
    const rem = displayMs;
    const prev = prevRemForTenSec.current;
    prevRemForTenSec.current = rem;
    const crossedIntoLastTen = prev != null && prev > 10_000 && rem <= 10_000 && rem > 0;
    if (!crossedIntoLastTen) return;
    void unlockAudio();
    playBeepTenSecondsWarning();
  }, [timer.phase, timer.phaseEndsAt, displayMs]);

  const canEdit = timer.phase === "idle" || timer.phase === "finished";
  const phaseForColor: TimerPhase =
    timer.phase === "paused" && timer.paused ? timer.paused.phase : timer.phase;
  const uk = uiKind(phaseForColor);

  const labelState = useMemo(() => {
    if (timer.phase === "paused") return tk.statePaused;
    switch (timer.phase) {
      case "countdown":
        return tk.statePrepare;
      case "round":
        return tk.stateRound;
      case "rest":
        return tk.stateRest;
      case "finished":
        return tk.stateDone;
      default:
        return "—";
    }
  }, [timer.phase, timer.paused, tk]);

  const roundLabel = useMemo(() => {
    if (timer.phase === "round") {
      return tk.roundOf.replace("{n}", String(timer.roundIdx + 1)).replace("{t}", String(timer.config.rounds));
    }
    if (timer.phase === "rest") {
      return tk.nextRound.replace("{n}", String(nextRoundDisplay1Based(timer.completedRoundIdx)));
    }
    if (timer.phase === "countdown") {
      return tk.roundOf.replace("{n}", "1").replace("{t}", String(timer.config.rounds));
    }
    return "—";
  }, [timer.phase, timer.roundIdx, timer.completedRoundIdx, timer.config.rounds, tk]);

  const onStart = async () => {
    await unlockAudio();
    const c = clampConfig(config);
    setConfig(c);
    setTimer((s) => startFromIdle({ ...s, config: c }, Date.now()));
  };

  const onPause = () => {
    setTimer((s) => pauseState(s, Date.now()));
  };

  const onResume = async () => {
    await unlockAudio();
    setTimer((s) => resumeState(s, Date.now()));
  };

  const onReset = () => {
    setTimer(resetState(clampConfig(config)));
    saveSessionSnapshot(null);
  };

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  };

  const applyPreset = (p: TimerConfig) => {
    const c = clampConfig(p);
    setConfig(c);
    if (timer.phase === "idle" || timer.phase === "finished") {
      setTimer(initialState(c));
    }
  };

  const onSavePreset = () => {
    const name = window.prompt(locale === "pt" ? "Nome do preset" : "Preset name");
    if (!name?.trim()) return;
    const id = `custom-${Date.now()}`;
    const preset: SavedPreset = { id, label: name.trim(), config: clampConfig(config) };
    const next = [...customPresets, preset];
    setCustomPresets(next);
    saveCustomPresets(next);
  };

  const allPresets = useMemo(() => [...BUILT_IN_PRESETS, ...customPresets], [customPresets]);

  const setField = (key: keyof TimerConfig, value: number) => {
    setConfig((c) => clampConfig({ ...c, [key]: value }));
  };

  return (
    <div
      ref={rootRef}
      className="round-timer-root max-w-[min(520px,100%)] mx-auto pb-10 px-3"
      data-ui={uk}
      style={{
        borderRadius: "var(--radius-lg)",
        background: "var(--rt-surface, var(--bg-secondary))",
        border: "1px solid var(--border)",
        padding: "clamp(16px, 4vw, 24px)",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/coach"
          className="text-sm font-medium no-underline hover:opacity-90"
          style={{ color: "var(--text-secondary)" }}
        >
          ← {tk.back}
        </Link>
        <button type="button" className="round-timer-btn round-timer-btn-secondary text-sm py-2 min-h-0" onClick={toggleFullscreen}>
          {fullscreen ? tk.exitFs : tk.fullscreen}
        </button>
      </div>

      <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        {tk.title}
      </h1>

      <section className="space-y-3 mb-5" style={{ opacity: canEdit ? 1 : 0.55, pointerEvents: canEdit ? "auto" : "none" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {tk.configTitle}
        </p>

        <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {tk.presetLabel}
          <select
            className="round-timer-input mt-1"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              const p = allPresets.find((x) => x.id === id);
              if (p) applyPreset(p.config);
            }}
          >
            <option value="">{locale === "pt" ? "— Escolher —" : "— Choose —"}</option>
            {allPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {tk.rounds}
            <input
              type="number"
              className="round-timer-input mt-1"
              min={1}
              max={99}
              value={config.rounds}
              onChange={(e) => setField("rounds", Number(e.target.value))}
            />
          </label>
          <div className="col-span-2">
            <DurationRollPicker
              label={
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  {tk.countdown}
                </span>
              }
              valueSec={config.countdownSec}
              onChangeSec={(n) => setField("countdownSec", n)}
              minSec={0}
              maxSec={120}
              disabled={!canEdit}
              ariaMinutes={tk.ariaMin}
              ariaSeconds={tk.ariaSec}
            />
          </div>
          <div className="col-span-2">
            <DurationRollPicker
              label={
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  {tk.roundTime}
                </span>
              }
              valueSec={config.roundSec}
              onChangeSec={(n) => setField("roundSec", n)}
              minSec={5}
              maxSec={3600}
              disabled={!canEdit}
              ariaMinutes={tk.ariaMin}
              ariaSeconds={tk.ariaSec}
            />
          </div>
          <div className="col-span-2">
            <DurationRollPicker
              label={
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  {tk.restTime}
                </span>
              }
              valueSec={config.restSec}
              onChangeSec={(n) => setField("restSec", n)}
              minSec={0}
              maxSec={3600}
              disabled={!canEdit}
              ariaMinutes={tk.ariaMin}
              ariaSeconds={tk.ariaSec}
            />
          </div>
        </div>

        <button type="button" className="round-timer-btn round-timer-btn-secondary w-full text-sm" onClick={onSavePreset}>
          {tk.savePreset}
        </button>
      </section>

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className="round-timer-btn round-timer-btn-secondary text-sm py-2 min-h-0"
          onClick={() => setTimerViewExpanded((v) => !v)}
          aria-expanded={timerViewExpanded}
        >
          {timerViewExpanded ? tk.minimizeView : tk.maximizeView}
        </button>
      </div>

      {timerViewExpanded ? (
        <>
          <div
            className="round-timer-display text-center mb-6 select-none"
            style={{
              fontSize: "clamp(3rem, 14vw, 4.5rem)",
              fontWeight: 800,
              lineHeight: 1,
              color: "var(--rt-accent, var(--primary))",
            }}
          >
            {formatMmSsFromMs(displayMs)}
          </div>

          <p className="text-center text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {labelState}
          </p>
          <p className="text-center text-base mb-6" style={{ color: "var(--text-secondary)" }}>
            {roundLabel}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-2">
            {timer.phase === "idle" || timer.phase === "finished" ? (
              <button type="button" className="round-timer-btn round-timer-btn-primary px-8" onClick={() => void onStart()}>
                {tk.start}
              </button>
            ) : timer.phase === "paused" ? (
              <>
                <button type="button" className="round-timer-btn round-timer-btn-primary px-8" onClick={() => void onResume()}>
                  {tk.resume}
                </button>
                <button type="button" className="round-timer-btn round-timer-btn-secondary" onClick={onReset}>
                  {tk.reset}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="round-timer-btn round-timer-btn-primary" onClick={onPause}>
                  {tk.pause}
                </button>
                <button type="button" className="round-timer-btn round-timer-btn-secondary" onClick={onReset}>
                  {tk.reset}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        <div
          className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3 select-none"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <div className="min-w-0 flex-1">
            <div
              className="font-extrabold tabular-nums leading-none"
              style={{ fontSize: "clamp(1.75rem, 8vw, 2.25rem)", color: "var(--rt-accent, var(--primary))" }}
            >
              {formatMmSsFromMs(displayMs)}
            </div>
            <p className="mt-1 truncate text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              {labelState} · {roundLabel}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {timer.phase === "idle" || timer.phase === "finished" ? (
              <button type="button" className="round-timer-btn round-timer-btn-primary px-4 py-2 text-sm" onClick={() => void onStart()}>
                {tk.start}
              </button>
            ) : timer.phase === "paused" ? (
              <>
                <button type="button" className="round-timer-btn round-timer-btn-primary px-4 py-2 text-sm" onClick={() => void onResume()}>
                  {tk.resume}
                </button>
                <button type="button" className="round-timer-btn round-timer-btn-secondary px-3 py-2 text-sm" onClick={onReset}>
                  {tk.reset}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="round-timer-btn round-timer-btn-primary px-4 py-2 text-sm" onClick={onPause}>
                  {tk.pause}
                </button>
                <button type="button" className="round-timer-btn round-timer-btn-secondary px-3 py-2 text-sm" onClick={onReset}>
                  {tk.reset}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
