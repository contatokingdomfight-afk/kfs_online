import { requireArbitrationAccess } from "@/lib/arbitration/auth";
import { listArbitrationFights } from "@/lib/arbitration/queries";
import { ArbitrationSubNav } from "@/components/arbitration/ArbitrationSubNav";
import { FightListBoard } from "@/components/arbitration/FightListBoard";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";

export const metadata = {
  title: "Arbitragem | Coach",
};

export default async function ArbitragemPage() {
  await requireArbitrationAccess();
  const locale = (await getLocaleFromCookies()) === "en" ? "en" : "pt";
  const fights = await listArbitrationFights();

  return (
    <div className="arb-page">
      <header className="arb-header">
        <h1 className="arb-title">🏆 Arbitragem</h1>
      </header>
      <ArbitrationSubNav />
      <FightListBoard fights={fights} locale={locale} />
    </div>
  );
}
