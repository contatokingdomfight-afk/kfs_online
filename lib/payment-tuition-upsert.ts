import type { SupabaseClient } from "@supabase/supabase-js";

/** Upsert pagamento de mensalidade (TUITION) para um mês. */
export async function upsertTuitionPayment(
  supabase: SupabaseClient,
  params: {
    studentId: string;
    referenceMonth: string;
    amount: number;
    status: "PAID" | "LATE";
  }
): Promise<{ error?: string }> {
  const { studentId, referenceMonth, amount, status } = params;

  const { data: existingRows, error: existingErr } = await supabase
    .from("Payment")
    .select("id, status")
    .eq("studentId", studentId)
    .eq("referenceMonth", referenceMonth)
    .eq("paymentType", "TUITION");

  if (existingErr) return { error: existingErr.message };

  const rows = existingRows ?? [];

  if (status === "PAID") {
    const keepId =
      rows.find((r) => (r as { status: string }).status === "PAID")?.id ??
      rows.find((r) => (r as { status: string }).status === "LATE")?.id;

    if (rows.length === 0) {
      const { error } = await supabase.from("Payment").insert({
        id: crypto.randomUUID(),
        studentId,
        amount,
        status: "PAID",
        referenceMonth,
        paymentType: "TUITION",
      });
      if (error) return { error: error.message };
    } else if (keepId) {
      const toDelete = rows.map((r) => (r as { id: string }).id).filter((id) => id !== keepId);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from("Payment").delete().in("id", toDelete);
        if (delErr) return { error: delErr.message };
      }
      const { error: upErr } = await supabase
        .from("Payment")
        .update({ amount, status: "PAID", paymentType: "TUITION" })
        .eq("id", keepId);
      if (upErr) return { error: upErr.message };
    }
  } else {
    if (rows.some((r) => (r as { status: string }).status === "PAID")) {
      return { error: `Já existe pagamento pago para ${referenceMonth}.` };
    }
    if (rows.length === 0) {
      const { error } = await supabase.from("Payment").insert({
        id: crypto.randomUUID(),
        studentId,
        amount,
        status: "LATE",
        referenceMonth,
        paymentType: "TUITION",
      });
      if (error) return { error: error.message };
    } else {
      const keepId = rows[0].id as string;
      const toDelete = rows.slice(1).map((r) => (r as { id: string }).id);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from("Payment").delete().in("id", toDelete);
        if (delErr) return { error: delErr.message };
      }
      const { error: upErr } = await supabase
        .from("Payment")
        .update({ amount, status: "LATE", paymentType: "TUITION" })
        .eq("id", keepId);
      if (upErr) return { error: upErr.message };
    }
  }

  return {};
}
