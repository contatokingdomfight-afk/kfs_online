"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { isMinorFromDateOfBirth } from "@/lib/waiver-content";

export type SignWaiverResult = { error?: string };

export async function signWaiver(
  _prev: SignWaiverResult | null,
  formData: FormData
): Promise<SignWaiverResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const signatureName = (formData.get("signatureName") as string)?.trim();
  const guardianName = (formData.get("guardianName") as string)?.trim() || null;
  const accepted = formData.get("accepted") === "on" || formData.get("accepted") === "true";

  if (!accepted) return { error: "Deves aceitar os termos para continuar." };
  if (!signatureName || signatureName.length < 3) return { error: "Indica o teu nome completo como assinatura." };

  const supabase = await createClient();
  const settings = await getInsuranceSettings(supabase);

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("dateOfBirth")
    .eq("studentId", studentId)
    .maybeSingle();

  const todayYmd = new Date().toISOString().slice(0, 10);
  const dob = (profile as { dateOfBirth?: string | null } | null)?.dateOfBirth ?? null;
  const isMinor = isMinorFromDateOfBirth(dob, todayYmd);
  if (isMinor && (!guardianName || guardianName.length < 3)) {
    return { error: "Indica o nome completo do responsável legal." };
  }

  const h = await headers();
  const signatureIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown";

  const row = {
    studentId,
    waiverSigned: true,
    waiverSignedAt: new Date().toISOString(),
    waiverVersion: settings.waiverVersion,
    signatureName,
    signatureIp,
    guardianName: isMinor ? guardianName : null,
    isMinor,
    updatedAt: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("StudentWaiver")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("StudentWaiver").update(row).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("StudentWaiver").insert({ id: crypto.randomUUID(), ...row });
    if (error) return { error: error.message };
  }

  revalidatePath("/waiver-signing");
  revalidatePath("/dashboard");

  const { data: student } = await supabase.from("Student").select("planId").eq("id", studentId).maybeSingle();
  if (student?.planId) {
    redirect("/dashboard");
  }
  redirect("/escolher-plano");
}
