import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { StudentExtraSessionsSection } from "@/app/admin/alunos/[id]/StudentExtraSessionsSection";
import { getPlanAccess } from "@/lib/plan-access";
import { getMonthlyCheckInLimit } from "@/lib/monthly-checkin-limit";
import { getDropInPricingContext } from "@/lib/extra-sessions-context";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";

type Props = {
  studentId: string;
  revalidateCoachPath?: string;
};

/** Secção de aulas avulsas/extra na ficha do aluno (admin ou coach). */
export async function StudentDropInSessionsPanel({ studentId, revalidateCoachPath }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const planAccess = await getPlanAccess(supabase, studentId);
  if (planAccess.hasCheckIn && planAccess.maxCheckInsPerMonth === null) {
    return null;
  }

  const currentReferenceMonth = currentReferenceMonthLisbon(new Date());
  const pricingContext = await getDropInPricingContext(supabase, studentId, currentReferenceMonth);

  const baseCap = planAccess.maxCheckInsPerMonth;
  const effectiveBase = baseCap ?? 0;

  const [monthly, { data: extraRows }, planRow] = await Promise.all([
    getMonthlyCheckInLimit(supabase, studentId, effectiveBase, currentReferenceMonth),
    supabase
      .from("StudentExtraSessions")
      .select("id, referenceMonth, quantity, note")
      .eq("studentId", studentId)
      .eq("referenceMonth", currentReferenceMonth)
      .order("createdAt", { ascending: false }),
    baseCap !== null && planAccess.currentPlanId
      ? supabase.from("Plan").select("name").eq("id", planAccess.currentPlanId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const mode = baseCap !== null ? "plan_cap" : "drop_in_only";
  const limit = monthly.limit ?? effectiveBase;

  if (mode === "drop_in_only" && limit <= 0) {
    return (
      <StudentExtraSessionsSection
        studentId={studentId}
        mode={mode}
        planName={null}
        maxCheckInsPerMonth={null}
        currentReferenceMonth={currentReferenceMonth}
        used={0}
        limit={0}
        remaining={0}
        extraGrants={[]}
        pricingContext={pricingContext}
        revalidateCoachPath={revalidateCoachPath}
      />
    );
  }

  return (
    <StudentExtraSessionsSection
      studentId={studentId}
      mode={mode}
      planName={(planRow?.data as { name?: string } | null)?.name ?? null}
      maxCheckInsPerMonth={baseCap}
      currentReferenceMonth={currentReferenceMonth}
      used={monthly.used}
      limit={limit}
      remaining={monthly.remaining ?? 0}
      extraGrants={(extraRows ?? []) as Array<{
        id: string;
        referenceMonth: string;
        quantity: number;
        note: string | null;
      }>}
      pricingContext={pricingContext}
      revalidateCoachPath={revalidateCoachPath}
    />
  );
}
