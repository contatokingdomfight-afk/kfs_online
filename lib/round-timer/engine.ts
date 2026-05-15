import type { PausedSnapshot, RoundTimerState, TimerConfig, TimerPhase } from "./types";
import { DEFAULT_CONFIG } from "./types";

export function initialState(config: TimerConfig = DEFAULT_CONFIG): RoundTimerState {
  return {
    phase: "idle",
    config: { ...config },
    phaseEndsAt: null,
    roundIdx: 0,
    completedRoundIdx: -1,
    paused: null,
  };
}

export function clampConfig(c: Partial<TimerConfig>): TimerConfig {
  const rounds = Math.min(99, Math.max(1, Math.floor(Number(c.rounds) || DEFAULT_CONFIG.rounds)));
  const roundSec = Math.min(3600, Math.max(5, Math.floor(Number(c.roundSec) || DEFAULT_CONFIG.roundSec)));
  const restSec = Math.min(3600, Math.max(0, Math.floor(Number(c.restSec) ?? DEFAULT_CONFIG.restSec)));
  const countdownSec = Math.min(120, Math.max(0, Math.floor(Number(c.countdownSec) ?? DEFAULT_CONFIG.countdownSec)));
  return { rounds, roundSec, restSec, countdownSec };
}

/** Milissegundos restantes até phaseEndsAt (mínimo 0). */
export function remainingMs(phaseEndsAt: number | null, now: number): number {
  if (phaseEndsAt == null) return 0;
  return Math.max(0, Math.ceil(phaseEndsAt - now));
}

export function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec + 1e-6));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function formatMmSsFromMs(ms: number): string {
  return formatMmSs(ms / 1000);
}

/** Avança fases até o relógio atual (ex.: app voltou do background). */
export function catchUp(state: RoundTimerState, now: number): RoundTimerState {
  if (state.phase === "idle" || state.phase === "finished" || state.phase === "paused") return state;
  let s = state;
  let guard = 0;
  while (s.phaseEndsAt != null && s.phaseEndsAt <= now && s.phase !== "finished" && guard++ < 500) {
    s = applyPhaseEnd(s, now);
  }
  return s;
}

/** Quando o tempo da fase atual chegou a zero (transição). */
export function applyPhaseEnd(state: RoundTimerState, now: number): RoundTimerState {
  const { config } = state;
  switch (state.phase) {
    case "countdown":
      return {
        ...state,
        phase: "round",
        roundIdx: 0,
        completedRoundIdx: -1,
        phaseEndsAt: now + config.roundSec * 1000,
      };
    case "round": {
      const r = state.roundIdx;
      if (r < config.rounds - 1) {
        return {
          ...state,
          phase: "rest",
          completedRoundIdx: r,
          phaseEndsAt: now + config.restSec * 1000,
        };
      }
      return {
        ...state,
        phase: "finished",
        phaseEndsAt: null,
      };
    }
    case "rest": {
      const next = state.completedRoundIdx + 1;
      return {
        ...state,
        phase: "round",
        roundIdx: next,
        phaseEndsAt: now + config.roundSec * 1000,
      };
    }
    default:
      return state;
  }
}

export function startFromIdle(state: RoundTimerState, now: number): RoundTimerState {
  const c = state.config;
  if (c.countdownSec > 0) {
    return {
      ...state,
      phase: "countdown",
      roundIdx: 0,
      completedRoundIdx: -1,
      phaseEndsAt: now + c.countdownSec * 1000,
      paused: null,
    };
  }
  return {
    ...state,
    phase: "round",
    roundIdx: 0,
    completedRoundIdx: -1,
    phaseEndsAt: now + c.roundSec * 1000,
    paused: null,
  };
}

export function pauseState(state: RoundTimerState, now: number): RoundTimerState {
  if (state.phase !== "countdown" && state.phase !== "round" && state.phase !== "rest") return state;
  if (state.phaseEndsAt == null) return state;
  const rem = remainingMs(state.phaseEndsAt, now);
  return {
    ...state,
    phase: "paused",
    paused: {
      phase: state.phase,
      remainingMs: rem,
      roundIdx: state.roundIdx,
      completedRoundIdx: state.completedRoundIdx,
    },
    phaseEndsAt: null,
  };
}

export function resumeState(state: RoundTimerState, now: number): RoundTimerState {
  if (state.phase !== "paused" || !state.paused) return state;
  const p = state.paused;
  return {
    ...state,
    phase: p.phase,
    roundIdx: p.roundIdx,
    completedRoundIdx: p.completedRoundIdx,
    phaseEndsAt: now + p.remainingMs,
    paused: null,
  };
}

export function resetState(config: TimerConfig): RoundTimerState {
  return initialState(config);
}

/** Próximo número de round (1-based) mostrado no descanso. */
export function nextRoundDisplay1Based(completedRoundIdx: number): number {
  return completedRoundIdx + 2;
}

/** Duração total da fase actual (para barra de progresso). Mínimo 1 ms para evitar divisão por zero. */
export function phaseDurationMs(phase: TimerPhase, config: TimerConfig, paused: PausedSnapshot | null): number {
  const eff = phase === "paused" && paused ? paused.phase : phase;
  if (eff === "countdown") return Math.max(1, config.countdownSec * 1000);
  if (eff === "round") return Math.max(1, config.roundSec * 1000);
  if (eff === "rest") return Math.max(1, config.restSec * 1000);
  return 1;
}

export type UiKind = "idle" | "prepare" | "round" | "rest" | "done";

export function uiKind(phase: TimerPhase): UiKind {
  if (phase === "idle") return "idle";
  if (phase === "finished") return "done";
  if (phase === "countdown") return "prepare";
  if (phase === "round") return "round";
  if (phase === "rest") return "rest";
  return "prepare";
}

export function serializeSession(state: RoundTimerState): string | null {
  if (state.phase === "idle" || state.phase === "finished") return null;
  return JSON.stringify({
    v: 1 as const,
    phase: state.phase,
    config: state.config,
    phaseEndsAt: state.phaseEndsAt,
    roundIdx: state.roundIdx,
    completedRoundIdx: state.completedRoundIdx,
    paused: state.paused,
  });
}

export function parseSession(raw: string | null): Partial<RoundTimerState> | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as {
      v?: number;
      phase?: TimerPhase;
      config?: TimerConfig;
      phaseEndsAt?: number | null;
      roundIdx?: number;
      completedRoundIdx?: number;
      paused?: PausedSnapshot | null;
    };
    if (o.v !== 1 || !o.config) return null;
    return {
      phase: o.phase,
      config: clampConfig(o.config),
      phaseEndsAt: o.phaseEndsAt ?? null,
      roundIdx: o.roundIdx ?? 0,
      completedRoundIdx: o.completedRoundIdx ?? -1,
      paused: o.paused ?? null,
    };
  } catch {
    return null;
  }
}
