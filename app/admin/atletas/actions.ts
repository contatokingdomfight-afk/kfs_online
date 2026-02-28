"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateAthleteResult = { error?: string };

export async function createAthlete(
  _prev: CreateAthleteResult | null,
  formData: FormData
): Promise<CreateAthleteResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const mainCoachIdRaw = (formData.get("mainCoachId") as string)?.trim() || null;
  const level = (formData.get("level") as string) || "INICIANTE";
  const validLevels = ["INICIANTE", "INTERMEDIARIO", "AVANCADO"];
  if (!studentId) return { error: "Aluno é obrigatório." };
  if (!validLevels.includes(level)) return { error: "Nível inválido." };

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("Athlete")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  if (existing) return { error: "Este aluno já é atleta." };

  const id = crypto.randomUUID();
  const { error } = await supabase.from("Athlete").insert({
    id,
    studentId,
    level,
    mainCoachId: mainCoachIdRaw || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/atletas");
  revalidatePath("/admin/atletas/novo");
  revalidatePath("/coach/atletas");
  redirect("/admin/atletas");
}
