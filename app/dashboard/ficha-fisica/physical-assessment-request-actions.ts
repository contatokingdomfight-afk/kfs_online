"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { notifyCoachesOfPhysicalAssessmentRequest } from "@/lib/notifications/in-app";

export type PhysicalAssessmentRequestActionResult = { error?: string; success?: boolean };

export async function createPhysicalAssessmentRequest(
  _prev: PhysicalAssessmentRequestActionResult | null,
  formData: FormData
): Promise<PhysicalAssessmentRequestActionResult> {
  const dbUser = await getCurrentDbUser();
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  if (!dbUser || dbUser.role !== "ALUNO") {
    return { error: t("physAssessRequestErrorNotStudent") };
  }
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: t("physAssessRequestErrorNoStudent") };

  const supabase = await createClient();
  const { data: st, error: stErr } = await supabase.from("Student").select("schoolId").eq("id", studentId).single();
  if (stErr || !st?.schoolId) return { error: t("physAssessRequestErrorNoSchool") };

  const noteRaw = (formData.get("note") as string)?.trim();
  const note = noteRaw ? noteRaw.slice(0, 500) : null;

  const { data: existing } = await supabase
    .from("PhysicalAssessmentRequest")
    .select("id")
    .eq("studentId", studentId)
    .eq("status", "PENDING")
    .maybeSingle();
  if (existing) return { error: t("physAssessRequestErrorAlreadyPending") };

  const { error } = await supabase.from("PhysicalAssessmentRequest").insert({
    id: randomUUID(),
    studentId,
    schoolId: st.schoolId,
    status: "PENDING",
    note,
  });

  if (error) {
    console.error("createPhysicalAssessmentRequest:", error);
    if (error.code === "23505") return { error: t("physAssessRequestErrorAlreadyPending") };
    return { error: t("physAssessRequestErrorGeneric") };
  }

  try {
    await notifyCoachesOfPhysicalAssessmentRequest(supabase, { schoolId: st.schoolId, studentId });
  } catch (e) {
    console.error("notifyCoachesOfPhysicalAssessmentRequest:", e);
  }

  revalidatePath("/dashboard/ficha-fisica");
  revalidatePath("/dashboard/performance");
  revalidatePath("/coach");
  revalidatePath("/coach/notificacoes");
  return { success: true };
}

export async function cancelPhysicalAssessmentRequest(): Promise<PhysicalAssessmentRequestActionResult> {
  const dbUser = await getCurrentDbUser();
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  if (!dbUser || dbUser.role !== "ALUNO") {
    return { error: t("physAssessRequestErrorNotStudent") };
  }
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: t("physAssessRequestErrorNoStudent") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("PhysicalAssessmentRequest")
    .update({ status: "CANCELLED" })
    .eq("studentId", studentId)
    .eq("status", "PENDING");

  if (error) {
    console.error("cancelPhysicalAssessmentRequest:", error);
    return { error: t("physAssessRequestErrorGeneric") };
  }

  revalidatePath("/dashboard/ficha-fisica");
  revalidatePath("/dashboard/performance");
  revalidatePath("/coach");
  return { success: true };
}
