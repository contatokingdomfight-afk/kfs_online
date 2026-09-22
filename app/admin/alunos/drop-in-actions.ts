"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseFinancePaymentMethodRequired } from "@/lib/finance-payment-method";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { createConfirmedAuthUser, generateInitialPassword } from "@/lib/admin-create-auth-user";
import { isSyntheticStudentEmail } from "@/lib/student-synthetic-email";
import { executeExtraSessionsGrant } from "@/lib/extra-sessions-grant";
import { canStaffManageDropInSessions } from "@/lib/staff-drop-in-access";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { coachTeachesAtSchool } from "@/lib/coach-schools";

const VALID_MODALITIES = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

export type CreateDropInStudentResult = {
  error?: string;
  success?: boolean;
  studentId?: string;
  loginEmail?: string;
  initialPassword?: string;
  syntheticLoginEmail?: boolean;
};

/**
 * Cadastro mínimo + pagamento de aulas avulsas (sem plano mensal).
 * Admin ou coach (escola seleccionada).
 */
export async function createDropInStudent(
  _prev: CreateDropInStudentResult | null,
  formData: FormData
): Promise<CreateDropInStudentResult> {
  const dbUser = await getCurrentDbUser();
  if (!canStaffManageDropInSessions(dbUser)) return { error: "Não autorizado." };
  const permErr = await adminPermissionError("admin:alunos:write");
  if (permErr) return { error: permErr };

  const name = (formData.get("name") as string)?.trim();
  const schoolId = (formData.get("schoolId") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const primaryModality = (formData.get("primaryModality") as string)?.trim();
  const emailInput = (formData.get("email") as string)?.trim().toLowerCase() || "";
  const taxIdRaw = (formData.get("taxId") as string)?.trim() || "";
  const taxId = taxIdRaw.replace(/\s/g, "") || null;
  const quantityStr = (formData.get("quantity") as string)?.trim();
  const amountStr = (formData.get("amount") as string)?.trim();
  const referenceMonth = (formData.get("referenceMonth") as string)?.trim() || currentReferenceMonthLisbon(new Date());
  const note = (formData.get("note") as string)?.trim() || null;

  if (!name || name.length < 2) return { error: "Indica o nome do aluno." };
  if (!schoolId) return { error: "Escola é obrigatória." };
  if (!phone || phone.length < 6) return { error: "Indica um telemóvel válido." };
  if (!emailInput) return { error: "Email é obrigatório." };
  if (!taxId || taxId.length < 9) return { error: "Indica um NIF válido." };
  if (!primaryModality || !VALID_MODALITIES.includes(primaryModality as (typeof VALID_MODALITIES)[number])) {
    return { error: "Escolhe a modalidade da aula avulsa." };
  }

  const quantity = parseInt(quantityStr ?? "", 10);
  if (Number.isNaN(quantity) || quantity < 1) return { error: "Quantidade de aulas inválida." };
  const amount = parseFloat(amountStr ?? "");
  if (Number.isNaN(amount) || amount < 0) return { error: "Valor inválido." };
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return { error: "Mês de referência inválido." };

  const methodResult = parseFinancePaymentMethodRequired(formData.get("paymentMethod") as string | null);
  if ("error" in methodResult) return { error: methodResult.error };

  const supabase = createAdminClient();

  const { data: school } = await supabase.from("School").select("id").eq("id", schoolId).eq("isActive", true).single();
  if (!school) return { error: "Escola inválida ou inativa." };

  if (dbUser!.role === "COACH") {
    const coachId = await getCurrentCoachId();
    if (!coachId) return { error: "Não autorizado." };
    const teaches = await coachTeachesAtSchool(supabase, coachId, schoolId);
    if (!teaches) return { error: "Sem permissão para esta escola." };
  }

  let loginEmail = emailInput;
  let syntheticLoginEmail = isSyntheticStudentEmail(loginEmail);

  const initialPassword = generateInitialPassword(10);

  const authResult = await createConfirmedAuthUser(supabase, {
    email: loginEmail,
    password: initialPassword,
    name,
  });
  if ("error" in authResult) return { error: authResult.error };

  const userId = crypto.randomUUID();
  const studentId = crypto.randomUUID();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    authUserId: authResult.authUserId,
    email: authResult.email,
    name,
    role: "ALUNO",
  });
  if (userError) return { error: userError.message };

  const { error: studentError } = await supabase.from("Student").insert({
    id: studentId,
    userId,
    schoolId,
    status: "ATIVO",
    registrationMode: "PRESENTIAL",
    syntheticLoginEmail,
    primaryModality,
  });
  if (studentError) return { error: studentError.message };

  const { error: profileError } = await supabase.from("StudentProfile").insert({
    studentId,
    hasCompletedOnboarding: true,
    phone,
    emergencyContact: phone,
  });
  if (profileError) return { error: profileError.message };

  const { error: enrollmentError } = await supabase.from("StudentEnrollmentForm").insert({
    id: crypto.randomUUID(),
    studentId,
    taxId,
    emergencyContactPhone: phone,
  });
  if (enrollmentError) return { error: enrollmentError.message };

  const grant = await executeExtraSessionsGrant(supabase, {
    studentId,
    quantity,
    amount,
    referenceMonth,
    paymentMethod: methodResult.method,
    note: note ?? "Cadastro aula avulsa",
  });
  if (grant.error) return { error: grant.error };

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/alunos/novo");
  revalidatePath("/coach/alunos");
  revalidatePath("/coach/alunos/novo");
  revalidatePath(`/admin/alunos/${studentId}/plano-seguro`);
  revalidatePath(`/coach/alunos/${studentId}`);
  revalidatePath("/admin/financeiro");
  revalidatePath("/coach/financeiro");

  return {
    success: true,
    studentId,
    loginEmail: authResult.email,
    initialPassword,
    syntheticLoginEmail,
  };
}
