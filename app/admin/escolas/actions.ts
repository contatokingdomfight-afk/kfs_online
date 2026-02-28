"use server";

import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type SchoolResult = { success?: string; error?: string } | null;

export async function createSchool(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;

  if (!name) return { error: "Nome é obrigatório." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const id = crypto.randomUUID();
  const { error } = await out.client.from("School").insert({
    id,
    name,
    address,
    city,
    phone,
    email,
    isActive: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/escolas");
  return { success: "Escola criada com sucesso." };
}

export async function updateSchool(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const id = (formData.get("schoolId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;

  if (!id || !name) return { error: "ID e nome são obrigatórios." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const { error } = await out.client
    .from("School")
    .update({ name, address, city, phone, email, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/escolas");
  return { success: "Escola atualizada." };
}

export async function toggleSchoolActive(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const id = (formData.get("schoolId") as string)?.trim();
  const isActive = formData.get("isActive") === "true";

  if (!id) return { error: "ID da escola é obrigatório." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const { error } = await out.client
    .from("School")
    .update({ isActive: !isActive, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/escolas");
  return { success: isActive ? "Escola desativada." : "Escola ativada." };
}
