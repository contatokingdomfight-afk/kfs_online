import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AdicionarMissaoForm } from "./AdicionarMissaoForm";
import { DeleteMissionButton } from "./DeleteMissionButton";
import { SeedMissionsForm } from "./SeedMissionsForm";
import { getBeltName } from "@/lib/belts";

export const dynamic = "force-dynamic";

export default async function AdminMissoesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: modalities } = await supabase
    .from("ModalityRef")
    .select("code, name")
    .order("sortOrder", { ascending: true });

  const selectCols = "id, name, description, modality, beltIndex, xpReward, sortOrder, isActive";
  let missions: { id: string; name: string; description: string | null; modality: string | null; beltIndex: number | null; xpReward: number; sortOrder: number; isActive: boolean }[] | null = null;
  let missionsError: { message: string } | null = null;
  let tableUsed: string = "MissionTemplate";

  const res = await supabase
    .from("MissionTemplate")
    .select(selectCols)
    .order("sortOrder", { ascending: true });
  missions = res.data;
  missionsError = res.error;

  if (missionsError && (missionsError.message?.includes("does not exist") || missionsError.message?.includes("relation"))) {
    const fallback = await supabase
      .from("mission_template")
      .select("id, name, description, modality, belt_index, xp_reward, sort_order, is_active")
      .order("sort_order", { ascending: true });
    if (!fallback.error && fallback.data?.length !== undefined) {
      tableUsed = "mission_template";
      missions = fallback.data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        description: (r.description as string | null) ?? null,
        modality: (r.modality as string | null) ?? null,
        beltIndex: (r.belt_index as number | null) ?? null,
        xpReward: (r.xp_reward as number) ?? 50,
        sortOrder: (r.sort_order as number) ?? 0,
        isActive: (r.is_active as boolean) ?? true,
      }));
      missionsError = null;
    } else if (fallback.error) {
      missionsError = fallback.error;
    }
  }

  const modalityOptions = (modalities ?? []).map((m) => ({ code: m.code, name: m.name ?? m.code }));
  const list = missions ?? [];

  const countRes = await supabase.from(tableUsed).select("*", { count: "exact", head: true });
  const totalCount = countRes.count ?? null;
  const countError = countRes.error;

  // Agrupar por faixa: null = "Qualquer faixa", depois por beltIndex 0, 1, 2, ...
  const byBelt = new Map<string, typeof list>();
  const KEY_ANY = "__qualquer__";
  for (const m of list) {
    const key = m.beltIndex == null ? KEY_ANY : String(m.beltIndex);
    if (!byBelt.has(key)) byBelt.set(key, []);
    byBelt.get(key)!.push(m);
  }
  const beltOrder = [KEY_ANY, ...Array.from({ length: 20 }, (_, i) => String(i))];
  const orderedBeltKeys = beltOrder.filter((k) => byBelt.has(k));
  const beltLabel = (key: string) => (key === KEY_ANY ? "Qualquer faixa" : getBeltName(parseInt(key, 10)));

  return (
    <div className="max-w-[min(640px,100%)] mx-auto p-4">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Link href="/admin" className="text-sm font-medium text-text-secondary hover:text-primary no-underline">
          ← Voltar
        </Link>
        <h1 className="text-xl font-semibold text-text-primary m-0">Missões</h1>
      </div>

      <p className="text-sm text-text-secondary mb-6">
        Missões padronizadas para todas as modalidades e, opcionalmente, por modalidade e por faixa (cor).
        O atleta vê apenas as missões que se aplicam à sua faixa e modalidade. As missões de dimensão
        (ex.: &quot;Subir Técnico para 5&quot;) são geradas automaticamente a partir das avaliações.
      </p>

      <SeedMissionsForm />

      <div className="mb-8">
        <AdicionarMissaoForm modalityOptions={modalityOptions} />
      </div>

      <h2 className="text-base font-semibold text-text-primary mb-3">Todas as missões (por faixa)</h2>

      <details className="mb-4 rounded-lg border border-border bg-bg-secondary p-3 text-sm">
        <summary className="cursor-pointer font-medium text-text-primary">Validar tabela no banco (diagnóstico)</summary>
        <dl className="mt-2 space-y-1 text-text-secondary">
          <div><dt className="inline font-medium">Tabela usada:</dt> <dd className="inline">{tableUsed}</dd></div>
          <div><dt className="inline font-medium">Total de linhas (count):</dt> <dd className="inline">{totalCount ?? "—"}</dd></div>
          {countError && <div><dt className="inline font-medium text-red-600">Erro no count:</dt> <dd className="inline text-red-600">{countError.message}</dd></div>}
          {missionsError && <div><dt className="inline font-medium text-red-600">Erro na listagem:</dt> <dd className="inline text-red-600">{missionsError.message}</dd></div>}
          <div className="pt-2 text-xs opacity-80">
            Se &quot;Total de linhas&quot; for 0 ou —, a tabela está vazia ou o nome está errado. No Supabase (Table Editor) confirma o nome exato da tabela (ex: MissionTemplate ou mission_template) e se há registos.
          </div>
        </dl>
      </details>

      {missionsError ? (
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">
          Erro ao carregar missões: {missionsError.message}
        </p>
      ) : null}
      {list.length === 0 && !missionsError ? (
        <p className="text-sm text-text-secondary">Ainda não há missões. Cria uma acima.</p>
      ) : list.length > 0 ? (
        <div className="flex flex-col gap-6">
          {orderedBeltKeys.map((key) => {
            const group = byBelt.get(key)!;
            const label = beltLabel(key);
            return (
              <section key={key}>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
                  {label}
                  <span className="font-normal text-text-secondary normal-case ml-1">
                    ({group.length} {group.length === 1 ? "missão" : "missões"})
                  </span>
                </h3>
                <ul className="list-none p-0 m-0 flex flex-col gap-3">
                  {group.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-xl bg-bg-secondary border border-border p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary m-0">{m.name}</p>
                        {m.description && (
                          <p className="text-sm text-text-secondary mt-1 mb-0">{m.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-bg border border-border text-text-secondary">
                            +{m.xpReward ?? 50} XP
                          </span>
                          {m.modality != null && (
                            <span className="text-xs px-2 py-0.5 rounded bg-bg border border-border text-text-secondary">
                              {m.modality}
                            </span>
                          )}
                          {m.beltIndex != null && (
                            <span className="text-xs px-2 py-0.5 rounded bg-bg border border-border text-text-secondary">
                              {getBeltName(m.beltIndex)}
                            </span>
                          )}
                        </div>
                      </div>
                      <DeleteMissionButton missionId={m.id} missionName={m.name} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
