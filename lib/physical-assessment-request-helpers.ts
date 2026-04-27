import type { SupabaseClient } from "@supabase/supabase-js";

/** Marca todos os pedidos PENDING deste aluno como cumpridos após registo da ficha. */
export async function fulfillPendingPhysicalAssessmentRequests(
  supabase: SupabaseClient,
  studentId: string
): Promise<void> {
  const fulfilledAt = new Date().toISOString();
  const { error } = await supabase
    .from("PhysicalAssessmentRequest")
    .update({ status: "FULFILLED", fulfilledAt })
    .eq("studentId", studentId)
    .eq("status", "PENDING");
  if (error) console.error("fulfillPendingPhysicalAssessmentRequests:", error);
}
