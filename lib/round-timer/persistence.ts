import type { TimerConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { clampConfig } from "./engine";

const KEY_CONFIG = "kfs-round-timer-config-v1";
const KEY_PRESETS = "kfs-round-timer-presets-v1";
const KEY_SESSION = "kfs-round-timer-session-v1";

export interface SavedPreset {
  id: string;
  label: string;
  config: TimerConfig;
}

export const BUILT_IN_PRESETS: SavedPreset[] = [
  { id: "box-3x3", label: "Boxe 3×3", config: { rounds: 3, roundSec: 180, restSec: 60, countdownSec: 10 } },
  { id: "muay-5x3", label: "Muay 5×3", config: { rounds: 5, roundSec: 180, restSec: 60, countdownSec: 15 } },
  { id: "hiit-10x1", label: "HIIT 10×1", config: { rounds: 10, roundSec: 60, restSec: 30, countdownSec: 5 } },
  { id: "spar-5x2", label: "Sparring 5×2", config: { rounds: 5, roundSec: 120, restSec: 60, countdownSec: 10 } },
];

export function loadStoredConfig(): TimerConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(KEY_CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    const o = JSON.parse(raw) as Partial<TimerConfig>;
    return clampConfig({ ...DEFAULT_CONFIG, ...o });
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveStoredConfig(config: TimerConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
  } catch {
    /* quota */
  }
}

export function loadCustomPresets(): SavedPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_PRESETS);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedPreset[];
    return Array.isArray(list) ? list.filter((p) => p.id && p.label && p.config) : [];
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: SavedPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_PRESETS, JSON.stringify(presets.slice(0, 20)));
  } catch {
    /* */
  }
}

export function saveSessionSnapshot(json: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (json) sessionStorage.setItem(KEY_SESSION, json);
    else sessionStorage.removeItem(KEY_SESSION);
  } catch {
    /* */
  }
}

export function loadSessionSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(KEY_SESSION);
  } catch {
    return null;
  }
}
