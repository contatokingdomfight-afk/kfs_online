"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { revalidatePath } from "next/cache";

export type LocationResult = { error?: string; success?: boolean };

export async function createLocation(_prev: LocationResult | null, formData: FormData): Promise<LocationResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  if (!name) return { error: "Nome do local é obrigatório." };

  const supabase = await createClient();
  const { data: max } = await supabase.from("Location").select("sortOrder").order("sortOrder", { ascending: false }).limit(1).single();
  const sortOrder = (max?.sortOrder ?? -1) + 1;

  const id = crypto.randomUUID();
  const { error } = await supabase.from("Location").insert({ id, name, address, sortOrder });

  if (error) {
    console.error("createLocation:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/locais");
  revalidatePath("/admin/turmas");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/agenda");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateLocation(_prev: LocationResult | null, formData: FormData): Promise<LocationResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const id = (formData.get("locationId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  if (!id || !name) return { error: "ID e nome são obrigatórios." };

  const supabase = await createClient();
  const { error } = await supabase.from("Location").update({ name, address }).eq("id", id);

  if (error) {
    console.error("updateLocation:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/locais");
  revalidatePath("/admin/turmas");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/agenda");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLocation(_prev: LocationResult | null, formData: FormData): Promise<LocationResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const id = (formData.get("locationId") as string)?.trim();
  if (!id) return { error: "ID do local é obrigatório." };

  const supabase = await createClient();
  const { data: lessons } = await supabase.from("Lesson").select("id").eq("locationId", id).limit(1);
  if (lessons?.length) return { error: "Não podes eliminar um local com aulas associadas. Altera ou remove as aulas primeiro." };

  const { error } = await supabase.from("Location").delete().eq("id", id);
  if (error) {
    console.error("deleteLocation:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/locais");
  revalidatePath("/admin/turmas");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/agenda");
  revalidatePath("/dashboard");
  return { success: true };
}
