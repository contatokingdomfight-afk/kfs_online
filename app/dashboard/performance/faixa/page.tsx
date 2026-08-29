import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getPlanAccess } from "@/lib/plan-access";
import { getRankInfoForStudent } from "@/lib/get-rank-info";
import { getRankNameForIndex } from "@/lib/xp-missions";
import { beltIdFromRankName } from "@/components/belt-progression/belt-progression-data";
import { BeltProgressionSection } from "@/components/belt-progression";

export const dynamic = "force-dynamic";

export default async function FaixaPage() {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);

  if (studentId && !planAccess.hasPerformanceTracking) {
    redirect("/dashboard?message=plan-no-performance");
  }

  const athleteState = studentId ? await getRankInfoForStudent(supabase, studentId) : null;

  return (
    <div style={{ maxWidth: "min(640px, 100%)", margin: "0 auto", padding: "clamp(16px, 4vw, 24px) 0" }}>
      <Link
        href="/dashboard/performance"
        style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500, display: "inline-block", marginBottom: 16 }}
      >
        ← Voltar ao Perfil do atleta
      </Link>

      {athleteState ? (
        <BeltProgressionSection
          currentXP={athleteState.rankInfo.xpCurrent}
          nextBeltXP={athleteState.rankInfo.xpNext}
          currentBelt={beltIdFromRankName(getRankNameForIndex(athleteState.rankInfo.rankIndex))}
          beltTimeGate={athleteState.rankInfo.beltTimeGate}
        />
      ) : (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          Ainda não há dados de progressão disponíveis.
        </p>
      )}
    </div>
  );
}
