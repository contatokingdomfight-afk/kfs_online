import { requireArbitrationAccess } from "@/lib/arbitration/auth";
import { listArbitrationEvents, listArbitrationCriteriaSets, listArbitrationJudges } from "@/lib/arbitration/queries";
import { ArbitrationSubNav } from "@/components/arbitration/ArbitrationSubNav";
import { GestaoPanel } from "@/components/arbitration/GestaoPanel";
import { Suspense } from "react";

export const metadata = {
  title: "Gestão | Arbitragem",
};

export default async function ArbitragemGestaoPage() {
  await requireArbitrationAccess();

  const [events, judges, criteriaSets] = await Promise.all([
    listArbitrationEvents(),
    listArbitrationJudges(),
    listArbitrationCriteriaSets(),
  ]);

  return (
    <div className="arb-page">
      <header className="arb-header">
        <h1 className="arb-title">Gestão</h1>
      </header>
      <ArbitrationSubNav />
      <p style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
        Configure eventos, combates, critérios e consulte os juízes do staff.
      </p>
      <Suspense fallback={<p style={{ color: "var(--text-secondary)" }}>A carregar…</p>}>
        <GestaoPanel events={events} judges={judges} criteriaSets={criteriaSets} />
      </Suspense>
    </div>
  );
}
