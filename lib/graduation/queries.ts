import "server-only";

/** PostgREST devolve no máximo 1000 linhas por pedido: percorre as páginas até ao fim. */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

/** Corre `fn` em blocos de ids (evita URLs gigantes em `.in(...)`) e junta os resultados. */
export async function inChunks<T>(ids: string[], fn: (chunk: string[]) => Promise<T[]>, size = 150): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += size) out.push(...(await fn(ids.slice(i, i + size))));
  return out;
}
