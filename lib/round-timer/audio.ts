/** Sino de início e fim de cada round (`end__boxing-bell.wav`). */
const SOUND_ROUND_BOXING_BELL = "/sounds/round-timer/end__boxing-bell.wav";
const SOUND_DIGITAL_BEEP = "/sounds/round-timer/digital-beep.wav";

let audioCtx: AudioContext | null = null;
let htmlAudioPrimed = false;
let muted = false;

/** Liga/desliga todos os avisos sonoros (persistência é responsabilidade do chamador). */
export function setAudioMuted(next: boolean): void {
  muted = next;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

/** Chamado após gesto do utilizador (Start) para desbloquear áudio no iOS/Safari. */
export async function unlockAudio(): Promise<void> {
  const ctx = getCtx();
  if (ctx?.state === "suspended") {
    await ctx.resume().catch(() => {});
  }
  if (typeof window === "undefined" || htmlAudioPrimed) return;
  try {
    const a = new Audio(SOUND_DIGITAL_BEEP);
    a.volume = 0.01;
    await a.play();
    a.pause();
    a.currentTime = 0;
    htmlAudioPrimed = true;
  } catch {
    /* sem ficheiro ou autoplay bloqueado — tentativas seguintes em playSample */
  }
}

function playSample(url: string, volume = 0.95): void {
  if (typeof window === "undefined" || muted) return;
  try {
    const a = new Audio(url);
    a.volume = volume;
    void a.play().catch(() => {});
  } catch {
    /* */
  }
}

/** Início de um round (após preparação ou após descanso). */
export function playRoundStartBell(): void {
  playSample(SOUND_ROUND_BOXING_BELL);
}

/** Fim de um round (antes do descanso ou treino concluído). */
export function playRoundEndBell(): void {
  playSample(SOUND_ROUND_BOXING_BELL);
}

/** Fim do treino: três badaladas para distinguir do fim de um round normal. */
export function playWorkoutEndBell(): void {
  playSample(SOUND_ROUND_BOXING_BELL);
  window.setTimeout(() => playSample(SOUND_ROUND_BOXING_BELL), 650);
  window.setTimeout(() => playSample(SOUND_ROUND_BOXING_BELL), 1300);
}

/** Aviso digital (10 s antes do fim do round; últimos 5 s do round em sequência). */
export function playDigitalBeep(volume = 0.9): void {
  playSample(SOUND_DIGITAL_BEEP, volume);
}

function beep(freq: number, durationSec: number, volume = 0.12): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + durationSec);
  o.start(t);
  o.stop(t + durationSec + 0.05);
}

export function playBeepCountdownTick(): void {
  beep(440, 0.05, 0.08);
}
