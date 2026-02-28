"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateCoachResult = { error?: string };

export async function createCoach(
  _prev: CreateCoachResult | null,
  formData: FormData
): Promise<CreateCoachResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const email = (formData.get("email") as string)?.trim();
  const name = (formData.get("name") as string)?.trim() || null;
  const specialties = (formData.get("specialties") as string)?.trim() || null;
  if (!email) return { error: "Email é obrigatório." };

  const supabase = createAdminClient();

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name ?? undefined },
  });

  if (inviteError) {
    if (inviteError.message.includes("already been registered")) {
      return { error: "Já existe um utilizador com este email." };
    }
    return { error: inviteError.message };
  }

  const authUser = inviteData?.user;
  if (!authUser?.id) {
    return {
      error: "Convite enviado, mas não foi possível criar o registo local. O coach pode fazer login e o perfil pode ser criado manualmente.",
    };
  }

  const userId = crypto.randomUUID();
  const coachId = crypto.randomUUID();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    authUserId: authUser.id,
    email: authUser.email ?? email,
    name: name ?? authUser.user_metadata?.full_name ?? null,
    role: "COACH",
  });

  if (userError) return { error: userError.message };

  const { error: coachError } = await supabase.from("Coach").insert({
    id: coachId,
    userId,
    specialties,
  });

  if (coachError) return { error: coachError.message };

  revalidatePath("/admin/coaches");
  revalidatePath("/admin/coaches/novo");
  redirect("/admin/coaches");
}

export type UpdateCoachResult = { error?: string };

export async function updateCoach(_prev: UpdateCoachResult | null, formData: FormData): Promise<UpdateCoachResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const coachId = (formData.get("coachId") as string)?.trim();
  if (!coachId) return { error: "ID do coach inválido." };

  const name = (formData.get("name") as string)?.trim() || null;
  const specialties = (formData.get("specialties") as string)?.trim() || null;

  const supabase = createAdminClient();

  const { data: coach } = await supabase.from("Coach").select("id, userId").eq("id", coachId).single();
  if (!coach) return { error: "Coach não encontrado." };

  if (name !== undefined) {
    const { error: userError } = await supabase.from("User").update({ name }).eq("id", coach.userId);
    if (userError) return { error: userError.message };
  }

  const { error: coachError } = await supabase
    .from("Coach")
    .update({ specialties })
    .eq("id", coachId);

  if (coachError) return { error: coachError.message };

  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${coach.id}`);
  return {};
}
