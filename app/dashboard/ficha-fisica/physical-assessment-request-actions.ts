"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { notifyCoachesOfPhysicalAssessmentRequest } from "@/lib/notifications/in-app";

export type PhysicalAssessmentRequestActionResult = { error?: string; success?: boolean };

type TFn = ReturnType<typeof getTranslations>;

function mapPhysicalRequestError(error: PostgrestError, t: TFn): string {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  const details = (error.details ?? "").toLowerCase();

  if (code === "23505" || msg.includes("duplicate") || msg.includes("unique") || details.includes("unique")) {
    return t("physAssessRequestErrorAlreadyPending");
  }
  if (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  ) {
    return t("physAssessRequestErrorDbNotReady");
  }
  if (
    code === "42501" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("new row violates row-level security")
  ) {
    return t("physAssessRequestErrorPermission");
  }
  if (code === "23503" || msg.includes("foreign key") || msg.includes("violates foreign key")) {
    return t("physAssessRequestErrorNoSchool");
  }

  console.error("PhysicalAssessmentRequest mutation:", code, error.message, error.details, error.hint);
  return t("physAssessRequestErrorGeneric");
}

export async function createPhysicalAssessmentRequest(
  _prev: PhysicalAssessmentRequestActionResult | null,
  formData: FormData
): Promise<PhysicalAssessmentRequestActionResult> {
  const dbUser = await getCurrentDbUser();
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const t = getTranslations(locale);
  if (!dbUser) return { error: t("physAssessRequestErrorNotStudent") };

  const studentId = await getCurrentStudentId();
  // Mesmo critério que a página da ficha: conta com registo Student (ALUNO, ADMIN em vista aluno, etc.).
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
    note,
  });

  if (error) {
    return { error: mapPhysicalRequestError(error, t) };
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
  if (!dbUser) return { error: t("physAssessRequestErrorNotStudent") };

  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: t("physAssessRequestErrorNoStudent") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("PhysicalAssessmentRequest")
    .update({ status: "CANCELLED" })
    .eq("studentId", studentId)
    .eq("status", "PENDING");

  if (error) {
    return { error: mapPhysicalRequestError(error, t) };
  }

  revalidatePath("/dashboard/ficha-fisica");
  revalidatePath("/dashboard/performance");
  revalidatePath("/coach");
  return { success: true };
}
