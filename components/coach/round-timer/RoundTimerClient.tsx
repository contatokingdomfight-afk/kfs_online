"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n";
import {
  applyPhaseEnd,
  catchUp,
  formatMmSs,
  formatMmSsFromMs,
  initialState,
  nextRoundDisplay1Based,
  parseSession,
  pauseState,
  phaseDurationMs,
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
  playDigitalBeep,
  playRoundEndBell,
  playRoundStartBell,
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

type Props = { locale: Locale; /** Na página de presenças: sem «voltar» nem título H1 duplicado. */ variant?: "page" | "embedded" };

export function RoundTimerClient({ locale, variant = "page" }: Props) {
  const isEmbedded = variant === "embedded";
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
      expandConfig: t("coachRoundTimerExpandConfig"),
      collapseConfig: t("coachRoundTimerCollapseConfig"),
      sec: t("coachRoundTimerSec"),
      min: t("coachRoundTimerMin"),
      ariaMin: t("coachRoundTimerAriaMinutes"),
      ariaSec: t("coachRoundTimerAriaSeconds"),
      skipPhase: t("coachRoundTimerSkipPhase"),
      skipAria: t("coachRoundTimerSkipAria"),
      progressAria: t("coachRoundTimerProgressAria"),
    }),
    [t]
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const [config, setConfig] = useState<TimerConfig>(() => loadStoredConfig());
  const [timer, setTimer] = useState<RoundTimerState>(() => initialState(loadStoredConfig()));
  const [displayMs, setDisplayMs] = useState(0);
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [configPanelExpanded, setConfigPanelExpanded] = useState(false);
  const timerPhaseRef = useRef<TimerPhase>("idle");
  timerPhaseRef.current = timer.phase;
  const prevPhase = useRef(timer.phase);
  const lastCountdownSec = useRef<number | null>(null);
  const lastCountdownUrgentSec = useRef<number | null>(null);
  const prevRemForTenSec = useRef<number | null>(null);
  const lastRoundUrgentSec = useRef<number | null>(null);
  const tenSecPhaseKey = `${timer.phase}-${timer.roundIdx}-${timer.completedRoundIdx}`;
  const countdownUrgentKey =
    timer.phase === "countdown" && timer.phaseEndsAt != null ? String(timer.phaseEndsAt) : "";

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(typeof document !== "undefined" && !!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function releaseWake() {
      try {
        await wakeLockRef.current?.release();
      } catch {
        /* */
      } finally {
        wakeLockRef.current = null;
      }
    }
    async function acquireWake() {
      if (typeof navigator === "undefined") return;
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
      };
      if (!nav.wakeLock?.request) return;
      try {
        await releaseWake();
        if (cancelled) return;
        const lock = await nav.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        wakeLockRef.current = lock;
      } catch {
        wakeLockRef.current = null;
      }
    }
    const active = timer.phase === "countdown" || timer.phase === "round" || timer.phase === "rest";
    if (active) void acquireWake();
    else void releaseWake();
    return () => {
      cancelled = true;
      void releaseWake();
    };
  }, [timer.phase]);

  useEffect(() => {
    function onVis() {
      void (async () => {
        if (typeof navigator === "undefined" || document.visibilityState !== "visible") return;
        const p = timerPhaseRef.current;
        if (p !== "countdown" && p !== "round" && p !== "rest") return;
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        if (!nav.wakeLock?.request) return;
        try {
          await wakeLockRef.current?.release().catch(() => {});
          wakeLockRef.current = null;
          wakeLockRef.current = await nav.wakeLock.request("screen");
        } catch {
          wakeLockRef.current = null;
        }
      })();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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
      playRoundStartBell();
      vibrateMs(120);
    } else if (is === "rest" && was === "round") {
      playRoundEndBell();
      vibrateMs(80);
    } else if (is === "finished" && was === "round") {
      playRoundEndBell();
      vibrateMs([100, 80, 100]);
    }
  }, [timer.phase]);

  useEffect(() => {
    lastCountdownUrgentSec.current = null;
  }, [countdownUrgentKey]);

  /* Beep sintético só no último segundo do preparo (5→2 usam digital-beep). */
  useEffect(() => {
    if (timer.phase !== "countdown" || timer.phaseEndsAt == null) {
      lastCountdownSec.current = null;
      return;
    }
    const sec = Math.ceil(remainingMs(timer.phaseEndsAt, Date.now()) / 1000);
    if (sec === 1 && lastCountdownSec.current !== sec) {
      lastCountdownSec.current = sec;
      void unlockAudio();
      playBeepCountdownTick();
    }
    if (sec > 1) lastCountdownSec.current = null;
  }, [timer.phase, timer.phaseEndsAt, displayMs]);

  /* Últimos 5 s do preparo (countdown): digital-beep em 5→4→3→2 (4 toques). */
  useEffect(() => {
    if (timer.phase !== "countdown" || timer.phaseEndsAt == null) {
      lastCountdownUrgentSec.current = null;
      return;
    }
    const rem = displayMs;
    if (rem <= 0 || rem > 5000) {
      lastCountdownUrgentSec.current = null;
      return;
    }
    const sec = Math.ceil(rem / 1000);
    if (sec < 2 || sec > 5) return;
    if (lastCountdownUrgentSec.current === sec) return;
    lastCountdownUrgentSec.current = sec;
    void unlockAudio();
    playDigitalBeep();
  }, [timer.phase, timer.phaseEndsAt, displayMs]);

  /* Aviso quando o tempo restante cruza para os últimos 10 s (ignora rounds/descansos já curtos desde o início) */
  useEffect(() => {
    prevRemForTenSec.current = null;
    lastRoundUrgentSec.current = null;
  }, [tenSecPhaseKey]);

  /* Últimos 10 s do round: um digital-beep ao cruzar o limiar. */
  useEffect(() => {
    if (timer.phase !== "round") return;
    if (timer.phaseEndsAt == null) return;
    const rem = displayMs;
    const prev = prevRemForTenSec.current;
    prevRemForTenSec.current = rem;
    const crossedIntoLastTen = prev != null && prev > 10_000 && rem <= 10_000 && rem > 0;
    if (!crossedIntoLastTen) return;
    void unlockAudio();
    playDigitalBeep();
    vibrateMs(40);
  }, [timer.phase, timer.phaseEndsAt, displayMs]);

  /* Últimos 5 s do round: um bip por segundo visível 5→4→3→2 (4 toques). */
  useEffect(() => {
    if (timer.phase !== "round" || timer.phaseEndsAt == null) {
      lastRoundUrgentSec.current = null;
      return;
    }
    const rem = displayMs;
    if (rem <= 0 || rem > 5000) {
      lastRoundUrgentSec.current = null;
      return;
    }
    const sec = Math.ceil(rem / 1000);
    if (sec < 2 || sec > 5) return;
    if (lastRoundUrgentSec.current === sec) return;
    lastRoundUrgentSec.current = sec;
    void unlockAudio();
    playDigitalBeep();
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

  const phaseProgress01 = useMemo(() => {
    if (timer.phase === "finished") return 1;
    if (timer.phase === "idle") return 0;
    const total = phaseDurationMs(timer.phase, timer.config, timer.paused);
    const elapsed = Math.max(0, total - displayMs);
    return Math.min(1, elapsed / total);
  }, [timer.phase, timer.config, timer.paused, displayMs]);

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

  const onSkipPhase = () => {
    void unlockAudio();
    const now = Date.now();
    setTimer((s) => {
      if (s.phase === "idle" || s.phase === "finished" || s.phase === "paused") return s;
      const after = applyPhaseEnd(s, now);
      return catchUp(after, now);
    });
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

  /** Config em ecrã: em idle/finished segue o editor; em treino segue a sessão. */
  const configForSummary = useMemo(() => {
    if (timer.phase === "idle" || timer.phase === "finished") return clampConfig(config);
    return clampConfig(timer.config);
  }, [config, timer.config, timer.phase]);

  const matchingPresetId = useMemo(() => {
    const c = configForSummary;
    const hit = allPresets.find(
      (p) =>
        p.config.rounds === c.rounds &&
        p.config.roundSec === c.roundSec &&
        p.config.restSec === c.restSec &&
        p.config.countdownSec === c.countdownSec
    );
    return hit?.id ?? "";
  }, [allPresets, configForSummary]);

  const configSummaryLine = useMemo(() => {
    const c = configForSummary;
    const preset = matchingPresetId ? allPresets.find((p) => p.id === matchingPresetId) : null;
    const label = preset?.label;
    const times = `${c.rounds}×${formatMmSs(c.roundSec)} · ${locale === "pt" ? "desc." : "rest"} ${formatMmSs(c.restSec)}`;
    return label ? `${label} · ${times}` : times;
  }, [allPresets, configForSummary, locale, matchingPresetId]);

  const setField = (key: keyof TimerConfig, value: number) => {
    setConfig((c) => clampConfig({ ...c, [key]: value }));
  };

  return (
    <div
      ref={rootRef}
      className={`round-timer-root px-3 ${isEmbedded ? "max-w-none pb-4" : "mx-auto max-w-[min(520px,100%)] pb-10"}`}
      data-ui={uk}
      style={{
        borderRadius: "var(--radius-lg)",
        background: "var(--rt-surface, var(--bg-secondary))",
        border: "1px solid var(--border)",
        padding: "clamp(16px, 4vw, 24px)",
      }}
    >
      {isEmbedded ? (
        <div className="mb-3 flex justify-end">
          <button type="button" className="round-timer-btn round-timer-btn-secondary text-sm py-2 min-h-0" onClick={toggleFullscreen}>
            {fullscreen ? tk.exitFs : tk.fullscreen}
          </button>
        </div>
      ) : (
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
      )}

      {!isEmbedded && (
        <h1 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          {tk.title}
        </h1>
      )}

      <section className="mb-5 space-y-3">
        {!configPanelExpanded ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {tk.configTitle}
              </p>
              <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                {configSummaryLine}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button
                type="button"
                className="round-timer-btn round-timer-btn-secondary text-sm py-2 min-h-0"
                onClick={() => setConfigPanelExpanded(true)}
                aria-expanded={false}
              >
                {tk.expandConfig}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {tk.configTitle}
              </p>
              <button
                type="button"
                className="round-timer-btn round-timer-btn-secondary shrink-0 text-sm py-2 min-h-0"
                onClick={() => setConfigPanelExpanded(false)}
                aria-expanded={true}
              >
                {tk.collapseConfig}
              </button>
            </div>

            <div className="space-y-3" style={{ opacity: canEdit ? 1 : 0.55, pointerEvents: canEdit ? "auto" : "none" }}>
        <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {tk.presetLabel}
          <select
            className="round-timer-input mt-1"
            value={matchingPresetId}
            onChange={(e) => {
              const id = e.target.value;
              const p = allPresets.find((x) => x.id === id);
              if (p) applyPreset(p.config);
            }}
          >
            <option value="">{locale === "pt" ? "— Personalizado —" : "— Custom —"}</option>
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
        </div>
          </>
        )}
      </section>

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

      <div
        className="round-timer-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(phaseProgress01 * 100)}
        aria-label={tk.progressAria}
      >
        <div className="round-timer-progress-fill" style={{ width: `${phaseProgress01 * 100}%` }} />
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
            <button
              type="button"
              className="round-timer-btn round-timer-btn-secondary"
              onClick={onSkipPhase}
              aria-label={tk.skipAria}
              title={tk.skipAria}
            >
              {tk.skipPhase}
            </button>
            <button type="button" className="round-timer-btn round-timer-btn-secondary" onClick={onReset}>
              {tk.reset}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
