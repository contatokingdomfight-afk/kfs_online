let audioCtx: AudioContext | null = null;

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
}

function beep(freq: number, durationSec: number, volume = 0.12): void {
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

export function playBeepRound(): void {
  beep(880, 0.12, 0.14);
}

/** Fim do round (antes do descanso): sequência audível tipo “gongo”. */
export function playBeepEndOfRound(): void {
  beep(660, 0.1, 0.14);
  setTimeout(() => beep(440, 0.14, 0.13), 120);
  setTimeout(() => beep(330, 0.22, 0.12), 300);
}

/** Aviso único quando faltam ~10 segundos no round ou no descanso. */
export function playBeepTenSecondsWarning(): void {
  beep(740, 0.16, 0.15);
}

export function playBeepFinish(): void {
  beep(660, 0.18, 0.13);
  setTimeout(() => beep(880, 0.22, 0.12), 160);
}

export function playBeepCountdownTick(): void {
  beep(440, 0.05, 0.08);
}
