import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings } from "@/lib/insurance-settings";

/**
 * Alinha pagamentos de seguro em LATE ao valor actual em Admin → Configurações.
 * Evita mostrar 25 € (ou outro valor antigo) quando `InsuranceSettings.annualAmount` já mudou.
 */
export async function syncPendingInsuranceAmounts(
  supabase: SupabaseClient,
  options?: { studentId?: string; referenceYear?: string }
): Promise<{ updated: number }> {
  const settings = await getInsuranceSettings(supabase);
  if (settings.annualAmount <= 0) return { updated: 0 };

  const referenceYear = options?.referenceYear ?? String(new Date().getFullYear());
  const amountStr = settings.annualAmount.toFixed(2);

  let query = supabase
    .from("Payment")
    .select("id, amount")
    .eq("paymentType", "INSURANCE")
    .eq("referenceYear", referenceYear)
    .eq("status", "LATE");

  if (options?.studentId) {
    query = query.eq("studentId", options.studentId);
  }

  const { data: rows, error } = await query;
  if (error || !rows?.length) return { updated: 0 };

  let updated = 0;
  for (const row of rows) {
    const current = Number((row as { amount: number | string }).amount);
    if (Math.abs(current - settings.annualAmount) < 0.009) continue;
    const { error: upErr } = await supabase
      .from("Payment")
      .update({ amount: amountStr })
      .eq("id", (row as { id: string }).id);
    if (!upErr) updated += 1;
  }

  return { updated };
}
