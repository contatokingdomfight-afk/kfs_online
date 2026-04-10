"use server";

import { revalidatePath } from "next/cache";
import { performCheckIn } from "@/lib/perform-check-in";
import { parseWellnessFromFormData } from "@/lib/wellness-score";

export type CheckInFormState = {
  error?: string;
  checkedInAt?: string;
} | null;

export async function submitCheckInAction(
  _prev: CheckInFormState,
  formData: FormData
): Promise<CheckInFormState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim();
  const occ = String(formData.get("occurrenceDate") ?? "").trim().slice(0, 10);
  if (!lessonId) return { error: "Aula inválida." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occ)) return { error: "Data da aula inválida." };

  const parsed = parseWellnessFromFormData(formData);
  if (!parsed.ok) return { error: parsed.error };

  const result = await performCheckIn(lessonId, {
    occurrenceDate: occ,
    wellness: parsed.wellness,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard");
  revalidatePath(`/check-in/${lessonId}`);
  return { checkedInAt: result.checkedInAt };
}
