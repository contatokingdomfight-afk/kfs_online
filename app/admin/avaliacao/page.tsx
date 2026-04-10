import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { ModalityCriteriaManager } from "./ModalityCriteriaManager";

export const dynamic = "force-dynamic";

export default async function AdminAvaliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ modality?: string }>;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const { data: modalitiesList } = await result.client
    .from("ModalityRef")
    .select("code, name")
    .order("sortOrder", { ascending: true });
  const modalities = modalitiesList ?? [];

  const params = await searchParams;
  const selectedModality =
    params.modality && modalities.some((m) => m.code === params.modality) ? params.modality : null;
  const selectedModalityName = selectedModality ? modalities.find((m) => m.code === selectedModality)?.name ?? selectedModality : null;

  const { data: dimensionsList } = await result.client
    .from("GeneralDimension")
    .select("id, code, name, sortOrder")
    .order("sortOrder", { ascending: true });
  const dimensions = dimensionsList ?? [];

  type ComponentBlock = { componentId: string; componentName: string; componentSortOrder: number; criteria: { id: string; label: string; description: string | null; sortOrder: number }[] };
  type DimensionWithComponents = { dimensionId: string; dimensionCode: string; dimensionName: string; dimensionSortOrder: number; components: ComponentBlock[] };
  let dimensionBlocks: DimensionWithComponents[] = dimensions.map((d) => ({
    dimensionId: d.id,
    dimensionCode: d.code,
    dimensionName: d.name,
    dimensionSortOrder: d.sortOrder,
    components: [],
  }));

  if (selectedModality) {
    const { data: components } = await result.client
      .from("EvaluationComponent")
      .select("id, name, sortOrder, dimensionId")
      .eq("modality", selectedModality)
      .order("sortOrder", { ascending: true });

    if (components?.length) {
      const componentIds = components.map((c) => c.id);
      const { data: criteria } = await result.client
        .from("EvaluationCriterion")
        .select("id, componentId, label, description, sortOrder")
        .in("componentId", componentIds)
        .order("sortOrder", { ascending: true });

      const criteriaByComponent = new Map<string, { id: string; label: string; description: string | null; sortOrder: number }[]>();
      (criteria ?? []).forEach((c) => {
        const list = criteriaByComponent.get(c.componentId) ?? [];
        list.push({ id: c.id, label: c.label, description: c.description, sortOrder: c.sortOrder });
        criteriaByComponent.set(c.componentId, list);
      });

      const byDimension = new Map<string, ComponentBlock[]>();
      components.forEach((c) => {
        if (c.dimensionId) {
          const list = byDimension.get(c.dimensionId) ?? [];
          list.push({ componentId: c.id, componentName: c.name, componentSortOrder: c.sortOrder, criteria: criteriaByComponent.get(c.id) ?? [] });
          byDimension.set(c.dimensionId, list);
        }
      });

      dimensionBlocks = dimensions.map((d) => ({
        dimensionId: d.id,
        dimensionCode: d.code,
        dimensionName: d.name,
        dimensionSortOrder: d.sortOrder,
        components: byDimension.get(d.id) ?? [],
      }));
    }
  }

  // Componentes das outras modalidades — para replicação de critérios
  type OtherModalityData = { code: string; name: string; components: { componentId: string; componentName: string }[] };
  let otherModalities: OtherModalityData[] = [];
  if (selectedModality) {
    const otherCodes = modalities.filter((m) => m.code !== selectedModality).map((m) => m.code);
    if (otherCodes.length > 0) {
      const { data: otherComponents } = await result.client
        .from("EvaluationComponent")
        .select("id, name, modality")
        .in("modality", otherCodes)
        .order("sortOrder", { ascending: true });
      otherModalities = modalities
        .filter((m) => m.code !== selectedModality)
        .map((m) => ({
          code: m.code,
          name: m.name,
          components: (otherComponents ?? [])
            .filter((c) => c.modality === m.code)
            .map((c) => ({ componentId: c.id, componentName: c.name })),
        }))
        .filter((m) => m.components.length > 0);
    }
  }

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          ← Admin
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)" }}>
        Critérios de avaliação por modalidade
      </h1>
      <p style={{ margin: "0 0 var(--space-5) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Escolhe a modalidade e configura as componentes gerais e os critérios (com descrição) que o treinador usa ao avaliar. O radar do atleta usa a média das últimas 10 avaliações.
      </p>

      {!selectedModality ? (
        <section>
          <p style={{ margin: "0 0 var(--space-3) 0", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>
            Escolhe a modalidade:
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {modalities.map((m) => (
              <li key={m.code}>
                <Link
                  href={`/admin/avaliacao?modality=${m.code}`}
                  className="card"
                  style={{
                    display: "block",
                    padding: "var(--space-4)",
                    textDecoration: "none",
                    fontSize: "var(--text-base)",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
            <Link
              href="/admin/avaliacao"
              style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}
            >
              ← Todas as modalidades
            </Link>
            <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)" }}>
              {selectedModalityName}
            </h2>
          </div>
          <ModalityCriteriaManager
            modality={selectedModality}
            modalityLabel={selectedModalityName ?? selectedModality}
            dimensionBlocks={dimensionBlocks}
            otherModalities={otherModalities}
          />
        </section>
      )}
    </div>
  );
}
