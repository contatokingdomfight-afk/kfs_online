import { requireArbitrationAccess } from "@/lib/arbitration/auth";
import { listArbitrationEvents, listArbitrationJudges } from "@/lib/arbitration/queries";
import { ArbitrationSubNav } from "@/components/arbitration/ArbitrationSubNav";
import { GestaoPanel } from "@/components/arbitration/GestaoPanel";

export const metadata = {
  title: "Gestão | Arbitragem",
};

export default async function ArbitragemGestaoPage() {
  await requireArbitrationAccess();

  const [events, judges] = await Promise.all([listArbitrationEvents(), listArbitrationJudges()]);

  return (
    <div className="arb-page">
      <header className="arb-header">
        <h1 className="arb-title">Gestão</h1>
      </header>
      <ArbitrationSubNav />
      <p style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
        Crie eventos internos e configure combates. Os juízes são os administradores, professores e assistentes da escola.
      </p>
      <GestaoPanel events={events} judges={judges} />
    </div>
  );
}
