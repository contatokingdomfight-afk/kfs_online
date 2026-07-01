/** Fecha o teclado no mobile antes do submit nativo (evita saltos de scroll no Android). */
export function blurActiveElementBeforeSubmit(): void {
  if (typeof document === "undefined") return;
  const el = document.activeElement;
  if (el instanceof HTMLElement) {
    el.blur();
  }
}
