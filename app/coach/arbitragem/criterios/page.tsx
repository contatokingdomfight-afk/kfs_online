import { requireArbitrationAccess } from "@/lib/arbitration/auth";
import { listArbitrationCriteriaSets, listArbitrationEvents } from "@/lib/arbitration/queries";
import { ArbitrationSubNav } from "@/components/arbitration/ArbitrationSubNav";
import {
  ArbitrationCriteriaList,
  ArbitrationScoringGuide,
} from "@/components/arbitration/ArbitrationCriteriaReference";

export const metadata = {
  title: "Critérios | Arbitragem",
};

function formatEventDate(value: string | null): string {
  if (!value) return "Data por definir";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ArbitragemCriteriosPage() {
  await requireArbitrationAccess();

  const [events, criteriaSets] = await Promise.all([
    listArbitrationEvents(),
    listArbitrationCriteriaSets(),
  ]);

  return (
    <div className="arb-page">
      <header className="arb-header">
        <h1 className="arb-title">Critérios de arbitragem</h1>
      </header>
      <ArbitrationSubNav />
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 14, maxWidth: 640 }}>
        Consulta os critérios e a escala de pontuação antes de julgar. Cada evento usa um perfil fixo no momento da
        criação — o que vês aqui é o que será aplicado nos combates desse evento.
      </p>

      <section className="arb-card" style={{ marginBottom: 20 }}>
        <ArbitrationScoringGuide />
      </section>

      <section className="arb-card" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 700 }}>Eventos activos</h2>
        {events.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
            Nenhum evento activo. Cria um evento em Gestão para definir os critérios aplicáveis.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {events.map((event, index) => (
              <article
                key={event.id}
                style={{
                  paddingTop: index === 0 ? 0 : 14,
                  borderTop: index === 0 ? undefined : "1px solid var(--border)",
                }}
              >
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>{event.name}</h3>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                  {formatEventDate(event.eventDate)}
                  {event.location ? ` · ${event.location}` : ""}
                  {` · ${event.criteriaSnapshot?.length ?? 0} critérios`}
                </p>
                <ArbitrationCriteriaList
                  criteria={event.criteriaSnapshot ?? []}
                  title="Critérios do evento"
                  compact
                />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="arb-card">
        <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 700 }}>Perfis de critérios</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)" }}>
          Perfis reutilizáveis ao criar eventos. O perfil escolhido é copiado para o evento e não muda depois.
        </p>
        <div style={{ display: "grid", gap: 16 }}>
          {criteriaSets.map((set, index) => (
            <article
              key={set.id}
              style={{
                paddingTop: index === 0 ? 0 : 12,
                borderTop: index === 0 ? undefined : "1px solid var(--border)",
              }}
            >
              <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600 }}>
                {set.name}
                {set.isBuiltin ? (
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                    (padrão)
                  </span>
                ) : null}
              </h3>
              <ArbitrationCriteriaList criteria={set.criteria} compact />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
