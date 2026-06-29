"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { stripe } from "@/lib/stripe/server";

export type DeleteAccountResult = { error?: string };

export async function deleteMyAccount(confirmText: string): Promise<DeleteAccountResult> {
  if (confirmText.trim() !== "ELIMINAR") {
    return { error: "Escreve ELIMINAR para confirmar." };
  }

  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." };

  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Perfil de aluno não encontrado." };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("Student")
    .select("id, userId, stripeSubscriptionId, digitalLibraryAddonSubscriptionId")
    .eq("id", studentId)
    .maybeSingle();

  if (!student?.userId || student.userId !== dbUser.id) {
    return { error: "Não autorizado." };
  }

  const subId = (student as { stripeSubscriptionId?: string | null }).stripeSubscriptionId;
  const addonSubId = (student as { digitalLibraryAddonSubscriptionId?: string | null }).digitalLibraryAddonSubscriptionId;

  if (stripe) {
    for (const id of [subId, addonSubId]) {
      if (!id) continue;
      try {
        await stripe.subscriptions.cancel(id);
      } catch (e) {
        console.error("[deleteMyAccount] Stripe cancel:", e);
      }
    }
  }

  const { error: delStudentErr } = await admin.from("Student").delete().eq("id", studentId);
  if (delStudentErr) {
    return { error: "Não foi possível eliminar o registo de aluno. Contacta a escola." };
  }

  await admin.from("User").delete().eq("id", dbUser.id);

  const { data: authUser } = await supabase.auth.getUser();
  const authId = authUser.user?.id;
  if (authId) {
    const { error: authDelErr } = await admin.auth.admin.deleteUser(authId);
    if (authDelErr) {
      console.error("[deleteMyAccount] auth delete:", authDelErr.message);
    }
  }

  await supabase.auth.signOut();
  redirect("/sign-in?deleted=1");
}
