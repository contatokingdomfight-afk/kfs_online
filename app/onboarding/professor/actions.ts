"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { schoolModalityCodes } from "@/lib/school-modalities";
import { normalizeCoachModalityCodes, normalizeCoachPhone } from "@/lib/coach-access-request";
import { sendCoachAccessRequestToDirectors } from "@/lib/notifications/email";

/** Escola Demo (só leitura): nunca aceita pedidos. Igual a DEMO_SCHOOL_ID em lib/demo.ts. */
const DEMO_SCHOOL_ID = "demo-school";

export type CoachRequestFormState = { error?: string; ok?: boolean };

export async function submitCoachAccessRequest(
  _prev: CoachRequestFormState | null,
  formData: FormData
): Promise<CoachRequestFormState> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida. Entra outra vez." };
  if (dbUser.role !== "ALUNO") return { error: "Esta conta já tem acesso de staff." };

  const schoolId = String(formData.get("schoolId") ?? "").trim();
  if (!schoolId || schoolId === DEMO_SCHOOL_ID) return { error: "Escolhe a escola onde dás aulas." };

  const supabase = createAdminClient();
  const { data: school } = await supabase.from("School").select("id, name, isActive").eq("id", schoolId).maybeSingle();
  if (!school || school.isActive === false) return { error: "Escola inválida." };

  const offered = await schoolModalityCodes(supabase, schoolId);
  const mods = normalizeCoachModalityCodes(formData.getAll("modalityCodes"), offered);
  if (mods.error) return { error: mods.error };
  const phone = normalizeCoachPhone(formData.get("phone"));
  if (phone.error) return { error: phone.error };

  const { error } = await supabase.from("CoachAccessRequest").insert({
    userId: dbUser.id,
    schoolId,
    modalityCodes: mods.codes,
    phone: phone.phone,
  });
  if (error) {
    if (error.code === "23505") return { error: "Já tens um pedido à espera de resposta." };
    return { error: "Não foi possível enviar o pedido. Tenta outra vez." };
  }

  // Avisa os diretores técnicos da escola; sem diretor, avisa o Admin Geral.
  const { data: directors } = await supabase.from("SchoolDirector").select("userId").eq("schoolId", schoolId);
  const directorIds = (directors ?? []).map((d) => d.userId as string);
  const { data: recipients } = directorIds.length
    ? await supabase.from("User").select("email").in("id", directorIds)
    : await supabase.from("User").select("email").eq("role", "ADMIN").eq("isNetworkAdmin", true);
  await sendCoachAccessRequestToDirectors({
    to: (recipients ?? []).map((r) => r.email as string),
    coachName: dbUser.name || dbUser.email,
    coachEmail: dbUser.email,
    schoolName: school.name as string,
    modalities: mods.codes,
  }).catch(() => ({}));

  revalidatePath("/onboarding/professor");
  revalidatePath("/admin/coaches");
  return { ok: true };
}

/** O próprio professor desiste do pedido pendente (por exemplo, para seguir como aluno). */
export async function cancelCoachAccessRequest(): Promise<void> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return;
  const supabase = createAdminClient();
  await supabase
    .from("CoachAccessRequest")
    .update({ status: "CANCELLED", decidedAt: new Date().toISOString() })
    .eq("userId", dbUser.id)
    .eq("status", "PENDING");
  revalidatePath("/onboarding/professor");
  revalidatePath("/admin/coaches");
}
