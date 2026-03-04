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

  const { data: missions } = await supabase
    .from("MissionTemplate")
    .select("id, name, description, modality, beltIndex, xpReward, sortOrder, isActive")
    .order("sortOrder", { ascending: true });

  const modalityOptions = (modalities ?? []).map((m) => ({ code: m.code, name: m.name ?? m.code }));
  const list = missions ?? [];

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
      {list.length === 0 ? (
        <p className="text-sm text-text-secondary">Ainda não há missões. Cria uma acima.</p>
      ) : (
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
      )}
    </div>
  );
}
