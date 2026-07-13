import { Suspense } from "react";
import { requireArbitrationAccess } from "@/lib/arbitration/auth";
import {
  filterFightsByJudge,
  listArbitrationEvents,
  listArbitrationFights,
  listArbitrationJudges,
} from "@/lib/arbitration/queries";
import { ArbitrationSubNav } from "@/components/arbitration/ArbitrationSubNav";
import { HistoryPanel } from "@/components/arbitration/HistoryPanel";

export const metadata = {
  title: "Histórico | Arbitragem",
};

type Props = {
  searchParams: Promise<{ evento?: string; modalidade?: string; data?: string; atleta?: string; juiz?: string }>;
};

export default async function ArbitragemHistoricoPage({ searchParams }: Props) {
  await requireArbitrationAccess();
  const params = await searchParams;

  let fights = await listArbitrationFights({ completedOnly: true, eventId: params.evento });

  if (params.atleta) {
    const q = params.atleta.toLowerCase();
    fights = fights.filter(
      (f) => f.athleteBlueName.toLowerCase().includes(q) || f.athleteRedName.toLowerCase().includes(q)
    );
  }

  if (params.modalidade) {
    fights = fights.filter((f) => f.modality === params.modalidade);
  }

  if (params.juiz) {
    const ids = await filterFightsByJudge(
      fights.map((f) => f.id),
      params.juiz
    );
    fights = fights.filter((f) => ids.has(f.id));
  }

  const [events, judges] = await Promise.all([listArbitrationEvents(), listArbitrationJudges()]);

  return (
    <div className="arb-page">
      <header className="arb-header">
        <h1 className="arb-title">Histórico</h1>
      </header>
      <ArbitrationSubNav />
      <Suspense fallback={<p style={{ color: "var(--text-secondary)" }}>A carregar…</p>}>
        <HistoryPanel fights={fights} events={events} judges={judges} />
      </Suspense>
    </div>
  );
}
