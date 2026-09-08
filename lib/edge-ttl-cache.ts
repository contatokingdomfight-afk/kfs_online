/**
 * Cache TTL em memória, escopo de módulo — best-effort no Edge runtime.
 * Instâncias "quentes" da Vercel (Fluid Compute) reaproveitam o módulo entre
 * requests, então isto pega a maioria das navegações em sequência do mesmo
 * utilizador; não é garantido entre instâncias diferentes (nesse caso, cai
 * para o comportamento actual — sem cache — nunca serve dado mais velho que o TTL).
 */
const store = new Map<string, { value: unknown; expiresAt: number }>();

export function edgeCacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function edgeCacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
