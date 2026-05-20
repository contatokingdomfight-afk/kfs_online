export type TimerPhase = "idle" | "countdown" | "round" | "rest" | "finished" | "paused";

export interface TimerConfig {
  rounds: number;
  roundSec: number;
  restSec: number;
  countdownSec: number;
}

export interface PausedSnapshot {
  phase: "countdown" | "round" | "rest";
  remainingMs: number;
  roundIdx: number;
  completedRoundIdx: number;
}

/** Estado em execução (deadlines em epoch ms). */
export interface RoundTimerState {
  phase: TimerPhase;
  config: TimerConfig;
  /** Fim da fase atual (countdown / round / rest). Null em idle/finished/paused (pausa usa snapshot). */
  phaseEndsAt: number | null;
  /** Índice 0-based do round atual quando phase === "round". */
  roundIdx: number;
  /** Após concluir um round, antes do descanso: último round concluído (0-based). Usado em "rest". */
  completedRoundIdx: number;
  paused: PausedSnapshot | null;
}

export const DEFAULT_CONFIG: TimerConfig = {
  rounds: 3,
  roundSec: 180,
  restSec: 60,
  /** Contagem antes do 1.º round (tempo para luvas / ringue); 10–15 s é o intervalo típico em boxe. */
  countdownSec: 12,
};
