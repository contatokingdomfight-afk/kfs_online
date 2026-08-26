/** Sino de início e fim de cada round (`end__boxing-bell.wav`). */
const SOUND_ROUND_BOXING_BELL = "/sounds/round-timer/end__boxing-bell.wav";
const SOUND_DIGITAL_BEEP = "/sounds/round-timer/digital-beep.wav";

let audioCtx: AudioContext | null = null;
let muted = false;

/**
 * Buffers descodificados em cache por URL. Tocar via AudioBufferSourceNode
 * (Web Audio API) em vez de `new Audio(url)` (HTMLMediaElement) evita que o
 * browser/WebView peça foco de áudio exclusivo ao SO — o som toca em
 * simultâneo com música de fundo (YouTube Music, Spotify, etc.) em vez de a
 * pausar, tal como já acontecia com o beep de contagem (oscillator puro).
 */
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();

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

function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  let cached = bufferCache.get(url);
  if (!cached) {
    cached = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .catch((e) => {
        console.warn(`round-timer audio: falhou a descodificar ${url}`, e);
        return null;
      });
    bufferCache.set(url, cached);
  }
  return cached;
}

/**
 * Alguns tablets/browsers suspendem o AudioContext sozinhos ao fim de um
 * período sem som (poupança de energia, ecrã a apagar, etc.) — sem isto, o
 * som fica "agendado" mas nunca se ouve porque o contexto continua parado.
 * Chamar sempre antes de tocar, não só uma vez no arranque.
 */
function ensureResumed(ctx: AudioContext): void {
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/** Chamado após gesto do utilizador (Start) para desbloquear e pré-carregar os sons. */
export async function unlockAudio(): Promise<void> {
  const ctx = getCtx();
  if (!ctx) return;
  ensureResumed(ctx);
  await Promise.all([loadBuffer(ctx, SOUND_ROUND_BOXING_BELL), loadBuffer(ctx, SOUND_DIGITAL_BEEP)]);
}

/** Reserva de segurança: se o Web Audio falhar (contexto indisponível ou som não descodifica), toca à moda antiga. */
function playViaHtmlAudioFallback(url: string, volume: number): void {
  try {
    const a = new Audio(url);
    a.volume = volume;
    void a.play().catch(() => {});
  } catch {
    /* sem mais alternativas */
  }
}

function playBuffer(url: string, volume: number): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) {
    playViaHtmlAudioFallback(url, volume);
    return;
  }
  ensureResumed(ctx);
  void loadBuffer(ctx, url).then((buffer) => {
    if (muted) return;
    if (!buffer) {
      playViaHtmlAudioFallback(url, volume);
      return;
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  });
}

/** Início de um round (após preparação ou após descanso). */
export function playRoundStartBell(): void {
  playBuffer(SOUND_ROUND_BOXING_BELL, 0.95);
}

/** Fim de um round (antes do descanso ou treino concluído). */
export function playRoundEndBell(): void {
  playBuffer(SOUND_ROUND_BOXING_BELL, 0.95);
}

/** Fim do treino: três badaladas para distinguir do fim de um round normal. */
export function playWorkoutEndBell(): void {
  playBuffer(SOUND_ROUND_BOXING_BELL, 0.95);
  window.setTimeout(() => playBuffer(SOUND_ROUND_BOXING_BELL, 0.95), 650);
  window.setTimeout(() => playBuffer(SOUND_ROUND_BOXING_BELL, 0.95), 1300);
}

/** Aviso digital (10 s antes do fim do round; últimos 5 s do round em sequência). */
export function playDigitalBeep(volume = 0.9): void {
  playBuffer(SOUND_DIGITAL_BEEP, volume);
}

function beep(freq: number, durationSec: number, volume = 0.12): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  ensureResumed(ctx);
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
