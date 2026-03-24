import type { SupabaseClient } from "@supabase/supabase-js";

export type StudentPaymentRow = {
  studentId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  planName: string | null;
  priceMonthly: number;
  referenceMonth: string;
  existingPayment: { status: string; amount: number } | null;
};

/**
 * Carrega dados para registar pagamento: utilizador, telefone, plano e pagamento já existente no mês.
 */
export async function loadStudentPaymentRows(
  supabase: SupabaseClient,
  studentIds: string[],
  referenceMonth: string
): Promise<StudentPaymentRow[]> {
  if (studentIds.length === 0) return [];

  const { data: students } = await supabase
    .from("Student")
    .select("id, userId, planId")
    .in("id", studentIds);

  if (!students?.length) return [];

  const userIds = [...new Set(students.map((s) => s.userId))];
  const planIds = [...new Set(students.map((s) => s.planId).filter(Boolean))] as string[];

  const [{ data: users }, { data: profiles }, { data: plans }, { data: payments }] = await Promise.all([
    supabase.from("User").select("id, name, email").in("id", userIds),
    supabase.from("StudentProfile").select("studentId, phone").in("studentId", studentIds),
    planIds.length
      ? supabase.from("Plan").select("id, name, price_monthly").in("id", planIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; price_monthly: number | null }[] }),
    supabase.from("Payment").select("studentId, status, amount").eq("referenceMonth", referenceMonth).in("studentId", studentIds),
  ]);

  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const profileByStudent = new Map((profiles ?? []).map((p) => [p.studentId, p]));
  const planById = new Map((plans ?? []).map((p) => [p.id, p]));
  const paymentByStudent = new Map((payments ?? []).map((p) => [p.studentId, p]));

  return students.map((s) => {
    const u = userById.get(s.userId);
    const prof = profileByStudent.get(s.id);
    const plan = s.planId ? planById.get(s.planId) : undefined;
    const pay = paymentByStudent.get(s.id);
    return {
      studentId: s.id,
      name: u?.name ?? null,
      email: u?.email ?? null,
      phone: (prof as { phone?: string | null } | undefined)?.phone ?? null,
      planName: plan?.name ?? null,
      priceMonthly: Number(plan?.price_monthly ?? 0),
      referenceMonth,
      existingPayment: pay
        ? { status: String((pay as { status: string }).status), amount: Number((pay as { amount: number }).amount) }
        : null,
    };
  });
}
