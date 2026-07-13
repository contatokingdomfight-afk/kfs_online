import { notFound } from "next/navigation";
import { requireArbitrationAccess } from "@/lib/arbitration/auth";
import { getFightJudgingState, resolveFightJudgeForUser } from "@/app/coach/arbitragem/actions";
import { FightJudgingClient } from "@/components/arbitration/FightJudgingClient";

export const metadata = {
  title: "Julgamento | Arbitragem",
};

type Props = {
  params: Promise<{ fightId: string }>;
};

export default async function ArbitragemFightPage({ params }: Props) {
  const access = await requireArbitrationAccess();
  const { fightId } = await params;

  const { assignments, suggestedFightJudgeId } = await resolveFightJudgeForUser(fightId, access.userId);
  if (assignments.length === 0) {
    const state = await getFightJudgingState(fightId, "");
    if (!state) notFound();
  }

  const initialByJudge: Record<string, NonNullable<Awaited<ReturnType<typeof getFightJudgingState>>>> = {};
  for (const a of assignments) {
    const state = await getFightJudgingState(fightId, a.id);
    if (state) initialByJudge[a.id] = state;
  }

  if (assignments.length > 0 && Object.keys(initialByJudge).length === 0) {
    notFound();
  }

  return (
    <FightJudgingClient
      fightId={fightId}
      assignments={assignments}
      suggestedFightJudgeId={suggestedFightJudgeId}
      initialByJudge={initialByJudge}
    />
  );
}
