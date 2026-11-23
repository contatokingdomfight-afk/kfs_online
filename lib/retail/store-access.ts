import "server-only";

import { redirect } from "next/navigation";
import { getSchoolScope } from "@/lib/school-scope";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";

/**
 * A loja é da rede e só está ligada na Sede (loja por escola desligada, ver DOCS/BACKLOG_Multi_Escola.md).
 * O diretor de outra escola não entra: vendas e encomendas têm nomes de clientes da Sede.
 * Chamar em cada página (não num layout: layout e página são renderizados em paralelo).
 */
export async function requireStoreAccess(): Promise<void> {
  const scope = await getSchoolScope();
  const allowed = scope.kind === "network" || (scope.kind === "school" && scope.schoolIds.includes(SEDE_SCHOOL_ID));
  if (!allowed) redirect("/admin");
}
