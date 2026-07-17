"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";
import { isEnrollmentFormCurrent, type PaymentMethodValue } from "@/lib/enrollment-form";
import { getStudentOnboardingFeesState } from "@/lib/student-onboarding-fees";

export type SaveEnrollmentFormResult = { error?: string };

function checkboxOn(formData: FormData, name: string): boolean {
  const v = formData.get(name);
  return v === "on" || v === "true";
}

export async function saveEnrollmentForm(
  _prev: SaveEnrollmentFormResult | null,
  formData: FormData
): Promise<SaveEnrollmentFormResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();
  const settings = await getInsuranceSettings(supabase);

  const { data: student } = await supabase
    .from("Student")
    .select("planId")
    .eq("id", studentId)
    .maybeSingle();

  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  if (!planId) return { error: "Escolhe um plano antes de preencher o comprovativo." };

  const idDocument = (formData.get("idDocument") as string)?.trim();
  const taxId = (formData.get("taxId") as string)?.trim();
  const addressLine = (formData.get("addressLine") as string)?.trim();
  const postalCode = (formData.get("postalCode") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const emergencyContactName = (formData.get("emergencyContactName") as string)?.trim();
  const emergencyContactRelationship = (formData.get("emergencyContactRelationship") as string)?.trim();
  const emergencyContactPhone = (formData.get("emergencyContactPhone") as string)?.trim();
  const paymentMethod = (formData.get("paymentMethod") as string)?.trim() as PaymentMethodValue;
  const debitIban = (formData.get("debitIban") as string)?.trim() || null;
  const allergies = (formData.get("allergies") as string)?.trim() || null;
  const knownHealthCondition = (formData.get("knownHealthCondition") as string)?.trim() || null;
  const emergencyMedication = (formData.get("emergencyMedication") as string)?.trim() || null;
  const membershipStartDate = (formData.get("membershipStartDate") as string)?.trim() || null;

  if (!idDocument || idDocument.length < 4) return { error: "Indica o n.º do Cartão de Cidadão ou Passaporte." };
  if (!taxId || taxId.replace(/\s/g, "").length < 9) return { error: "Indica um NIF válido." };
  if (!addressLine || addressLine.length < 5) return { error: "Indica a morada completa." };
  if (!postalCode || postalCode.length < 4) return { error: "Indica o código postal." };
  if (!phone || phone.length < 9) return { error: "Indica um telefone de contacto." };
  if (!emergencyContactName || emergencyContactName.length < 3) {
    return { error: "Indica o nome do contacto de emergência." };
  }
  if (!emergencyContactRelationship) return { error: "Indica o parentesco do contacto de emergência." };
  if (!emergencyContactPhone || emergencyContactPhone.length < 9) {
    return { error: "Indica o telefone do contacto de emergência." };
  }
  if (paymentMethod !== "DEBIT_DIRECT" && paymentMethod !== "OTHER") {
    return { error: "Escolhe a forma de pagamento." };
  }
  if (paymentMethod === "DEBIT_DIRECT" && (!debitIban || debitIban.replace(/\s/g, "").length < 15)) {
    return { error: "Indica o IBAN para débito direto." };
  }

  const fees = await getStudentOnboardingFeesState(supabase, studentId);
  const insuranceAccepted = checkboxOn(formData, "insuranceAccepted");
  if (fees.showInsurance && !insuranceAccepted) {
    return { error: "Deves aceitar o pagamento do seguro desportivo." };
  }

  const row = {
    studentId,
    formCompleted: true,
    formCompletedAt: new Date().toISOString(),
    formVersion: settings.enrollmentFormVersion,
    planId,
    idDocument,
    taxId,
    addressLine,
    postalCode,
    emergencyContactName,
    emergencyContactRelationship,
    emergencyContactPhone,
    paymentMethod,
    debitIban: paymentMethod === "DEBIT_DIRECT" ? debitIban : null,
    allergies,
    knownHealthCondition,
    emergencyMedication,
    consentPhoto: checkboxOn(formData, "consentPhoto"),
    consentVideo: checkboxOn(formData, "consentVideo"),
    consentSocialMedia: checkboxOn(formData, "consentSocialMedia"),
    consentMarketing: checkboxOn(formData, "consentMarketing"),
    insuranceAccepted: fees.showInsurance ? insuranceAccepted : false,
    membershipStartDate: membershipStartDate || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("StudentEnrollmentForm")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("StudentEnrollmentForm").update(row).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("StudentEnrollmentForm")
      .insert({ id: crypto.randomUUID(), ...row });
    if (error) return { error: error.message };
  }

  const emergencyContact = `${emergencyContactName} (${emergencyContactRelationship}) — ${emergencyContactPhone}`;
  const medicalNotes = [knownHealthCondition, allergies ? `Alergias: ${allergies}` : null, emergencyMedication ? `Medicação: ${emergencyMedication}` : null]
    .filter(Boolean)
    .join("\n");

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  const profilePatch = {
    phone,
    emergencyContact,
    medicalNotes: medicalNotes || null,
    updatedAt: new Date().toISOString(),
  };

  if (profile?.id) {
    await supabase.from("StudentProfile").update(profilePatch).eq("id", profile.id);
  }

  revalidatePath("/adesao");
  revalidatePath("/dashboard/documentos-adesao");
  redirect("/adesao?passo=2");
}
