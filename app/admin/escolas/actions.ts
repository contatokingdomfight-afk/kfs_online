"use server";

import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { SCHOOLS_CACHE_TAG } from "@/lib/cached-reference-data";
import { adminPermissionError } from "@/lib/permissions/assert";
import { disconnectSchoolBank, saveSchoolBankCertificate } from "@/lib/revolut/bank-accounts";
import { connectSchoolMerchantAccount, disconnectSchoolMerchantAccount } from "@/lib/revolut/merchant-accounts";
import { getSchoolScope, isNetworkScope } from "@/lib/school-scope";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";
import { hasLegalData, missingToOpen, type SchoolPaymentMethods } from "@/lib/school-status";
import { createAdminClient, getAdminClientOrNull } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type SchoolResult = { success?: string; error?: string } | null;

export type DirectorCandidate = {
  userId: string;
  name: string | null;
  email: string;
  role: "ALUNO" | "COACH" | "ADMIN";
  schoolName: string | null;
};

const PAYMENT_METHOD_COLUMNS = "ibanEnabled, iban, mbwayEnabled, mbwayPhone, revolutEnabled, multibancoEnabled";

/** Criar escolas e nomear diretores é só do Admin Geral: um diretor com acesso total também é `ADMIN`. */
async function networkAdminError(): Promise<string | null> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return "Não autorizado.";
  if (!isNetworkScope(await getSchoolScope())) return "Só o Admin Geral pode gerir as escolas da rede.";
  return adminPermissionError("admin:escolas:write");
}

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string) ?? "").trim();
}

function revalidateSchool(schoolId: string) {
  revalidateTag(SCHOOLS_CACHE_TAG);
  revalidatePath("/admin/escolas");
  revalidatePath(`/admin/escolas/${schoolId}`);
}

function revalidateSchoolTeam(schoolId: string) {
  revalidatePath("/admin/escolas");
  revalidatePath(`/admin/escolas/${schoolId}`);
}

export async function createSchool(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };

  const name = field(formData, "name");
  if (!name) return { error: "Nome é obrigatório." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const id = crypto.randomUUID();
  // Fica em preparação (isActive false, openedAt null): os alunos só a veem depois de aberta.
  const { error } = await out.client.from("School").insert({
    id,
    name,
    address: field(formData, "address") || null,
    city: field(formData, "city") || null,
    phone: field(formData, "phone") || null,
    email: field(formData, "email") || null,
    isActive: false,
    openedAt: null,
  });
  if (error) return { error: error.message };

  revalidateSchool(id);
  redirect(`/admin/escolas/${id}`);
}

export async function updateSchool(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };

  const id = field(formData, "schoolId");
  const name = field(formData, "name");
  if (!id || !name) return { error: "ID e nome são obrigatórios." };

  // A Sede não tem estes campos no formulário: o contrato dela é um texto fixo.
  const hasLegalFields = formData.has("legalName");
  const nif = field(formData, "nif").replace(/\s/g, "");
  if (nif && !/^\d{9}$/.test(nif)) return { error: "O NIPC deve ter 9 dígitos." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const { error } = await out.client
    .from("School")
    .update({
      name,
      address: field(formData, "address") || null,
      city: field(formData, "city") || null,
      phone: field(formData, "phone") || null,
      email: field(formData, "email") || null,
      ...(hasLegalFields ? { legalName: field(formData, "legalName") || null, legalAddress: field(formData, "legalAddress") || null } : {}),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  if (hasLegalFields) {
    const { error: nifError } = await out.client
      .from("SchoolPaymentSettings")
      .upsert({ schoolId: id, nif: nif || null, updatedAt: new Date().toISOString() }, { onConflict: "schoolId" });
    if (nifError) return { error: nifError.message };
  }

  revalidateSchool(id);
  return { success: "Escola atualizada." };
}

/** Abre uma escola em preparação ou reativa uma desativada; as condições são as mesmas. */
export async function openSchool(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };

  const id = field(formData, "schoolId");
  if (!id) return { error: "ID da escola é obrigatório." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };
  const supabase = out.client;

  const [{ data: school }, { count: directorCount }, { data: settings }] = await Promise.all([
    supabase.from("School").select("id, openedAt, legalName, legalAddress").eq("id", id).maybeSingle(),
    supabase.from("SchoolDirector").select("id", { count: "exact", head: true }).eq("schoolId", id),
    supabase.from("SchoolPaymentSettings").select(`${PAYMENT_METHOD_COLUMNS}, nif`).eq("schoolId", id).maybeSingle(),
  ]);
  if (!school) return { error: "Escola não encontrada." };

  const nif = (settings as { nif?: string | null } | null)?.nif;
  const legalDataReady =
    id === SEDE_SCHOOL_ID || hasLegalData({ legalName: school.legalName as string | null, legalAddress: school.legalAddress as string | null, nif });
  const missing = missingToOpen(directorCount ?? 0, settings as SchoolPaymentMethods | null, legalDataReady);
  if (missing.length > 0) return { error: `Falta: ${missing.join(", ")}.` };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("School")
    .update({ isActive: true, openedAt: (school.openedAt as string | null) ?? now, updatedAt: now })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateSchool(id);
  return { success: "Escola aberta." };
}

export async function deactivateSchool(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };

  const id = field(formData, "schoolId");
  if (!id) return { error: "ID da escola é obrigatório." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const { count } = await out.client
    .from("Student")
    .select("id", { count: "exact", head: true })
    .eq("schoolId", id)
    .eq("status", "ATIVO");
  if (count) return { error: `Esta escola tem ${count} aluno(s) ativo(s). Muda-os de escola ou inativa-os primeiro.` };

  const { error } = await out.client
    .from("School")
    .update({ isActive: false, updatedAt: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateSchool(id);
  return { success: "Escola desativada." };
}

/** Pesquisa contas para nomear; quem já é Admin Geral ou diretor desta escola não aparece. */
export async function searchDirectorCandidates(schoolId: string, query: string): Promise<DirectorCandidate[]> {
  if (await networkAdminError()) return [];

  const term = query.replace(/[%_,()*\\]/g, " ").trim();
  if (term.length < 2) return [];

  const out = getAdminClientOrNull();
  if (!out.client) return [];
  const supabase = out.client;

  const [{ data: users }, { data: directors }] = await Promise.all([
    supabase
      .from("User")
      .select("id, name, email, role")
      .eq("isNetworkAdmin", false)
      .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
      .order("name", { ascending: true })
      .limit(20),
    supabase.from("SchoolDirector").select("userId").eq("schoolId", schoolId),
  ]);

  const taken = new Set((directors ?? []).map((d) => d.userId as string));
  const rows = (users ?? []).filter((u) => !taken.has(u.id as string)).slice(0, 8);
  const ids = rows.map((u) => u.id as string);
  if (ids.length === 0) return [];

  const [{ data: students }, { data: coaches }, { data: schools }] = await Promise.all([
    supabase.from("Student").select("userId, schoolId").in("userId", ids),
    supabase.from("Coach").select("id, userId").in("userId", ids),
    supabase.from("School").select("id, name"),
  ]);
  const coachIds = (coaches ?? []).map((c) => c.id as string);
  const { data: coachSchools } = coachIds.length
    ? await supabase.from("CoachSchool").select("coachId, schoolId").in("coachId", coachIds)
    : { data: [] };

  const schoolName = new Map((schools ?? []).map((s) => [s.id as string, s.name as string]));
  const schoolOfUser = new Map<string, string>();
  for (const s of students ?? []) schoolOfUser.set(s.userId as string, s.schoolId as string);
  for (const c of coaches ?? []) {
    const link = (coachSchools ?? []).find((cs) => cs.coachId === c.id);
    if (link) schoolOfUser.set(c.userId as string, link.schoolId as string);
  }

  return rows.map((u) => ({
    userId: u.id as string,
    name: u.name as string | null,
    email: u.email as string,
    role: u.role as DirectorCandidate["role"],
    schoolName: schoolName.get(schoolOfUser.get(u.id as string) ?? "") ?? null,
  }));
}

export async function nominateDirector(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };
  const actor = await getCurrentDbUser();

  const schoolId = field(formData, "schoolId");
  const userId = field(formData, "userId");
  if (!schoolId || !userId) return { error: "Escolhe uma pessoa." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };
  const supabase = out.client;

  const { data: target } = await supabase.from("User").select("id, role, isNetworkAdmin").eq("id", userId).maybeSingle();
  if (!target) return { error: "Utilizador não encontrado." };
  if (target.isNetworkAdmin) return { error: "O Admin Geral já tem acesso a todas as escolas." };

  const { error: linkError } = await supabase
    .from("SchoolDirector")
    .insert({ userId, schoolId, createdByUserId: actor?.id ?? null });
  if (linkError) {
    return { error: linkError.code === "23505" ? "Esta pessoa já é diretor desta escola." : linkError.message };
  }

  if (target.role !== "ADMIN") {
    const { error: roleError } = await supabase.from("User").update({ role: "ADMIN" }).eq("id", userId);
    if (roleError) {
      await supabase.from("SchoolDirector").delete().eq("userId", userId).eq("schoolId", schoolId);
      return { error: roleError.message };
    }
  }

  revalidateSchoolTeam(schoolId);
  return { success: "Diretor nomeado." };
}

/** Conta nova: fica logo como diretor; `pendente` até a pessoa entrar pela 1.ª vez. */
export async function inviteDirector(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };
  const actor = await getCurrentDbUser();

  const schoolId = field(formData, "schoolId");
  const name = field(formData, "name") || null;
  const email = field(formData, "email").toLowerCase();
  if (!schoolId || !email) return { error: "O email é obrigatório." };

  const supabase = createAdminClient();

  const { data: existing } = await supabase.from("User").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "Já existe uma conta com este email. Procura-a na pesquisa acima." };

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
  if (!authUser?.id) return { error: "O convite foi enviado, mas não foi possível criar a conta." };

  const userId = crypto.randomUUID();
  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    authUserId: authUser.id,
    email: authUser.email ?? email,
    name,
    role: "ADMIN",
  });
  if (userError) {
    // Sem isto, o email ficaria preso no Auth e o convite não podia ser repetido.
    await supabase.auth.admin.deleteUser(authUser.id);
    return { error: userError.message };
  }

  const { error: linkError } = await supabase
    .from("SchoolDirector")
    .insert({ userId, schoolId, createdByUserId: actor?.id ?? null });
  if (linkError) return { error: linkError.message };

  revalidateSchoolTeam(schoolId);
  return { success: `Convite enviado a ${email}.` };
}

export async function resendDirectorInvite(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };

  const email = field(formData, "email");
  if (!email) return { error: "Email em falta." };

  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(email);
  if (error) return { error: error.message };
  return { success: "Convite reenviado." };
}

/** A conta fica; só perde o backoffice se não for diretor de mais nenhuma escola. */
export async function removeDirector(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };

  const schoolId = field(formData, "schoolId");
  const userId = field(formData, "userId");
  if (!schoolId || !userId) return { error: "Dados em falta." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };
  const supabase = out.client;

  const { error } = await supabase.from("SchoolDirector").delete().eq("userId", userId).eq("schoolId", schoolId);
  if (error) return { error: error.message };

  const [{ count: otherSchools }, { data: target }, { data: coach }] = await Promise.all([
    supabase.from("SchoolDirector").select("id", { count: "exact", head: true }).eq("userId", userId),
    supabase.from("User").select("role, isNetworkAdmin").eq("id", userId).maybeSingle(),
    supabase.from("Coach").select("id").eq("userId", userId).maybeSingle(),
  ]);
  if (!otherSchools && target?.role === "ADMIN" && !target.isNetworkAdmin) {
    const { error: roleError } = await supabase
      .from("User")
      .update({ role: coach ? "COACH" : "ALUNO" })
      .eq("id", userId);
    if (roleError) return { error: roleError.message };
  }

  revalidateSchoolTeam(schoolId);
  return { success: "Diretor removido." };
}

export async function saveSchoolPaymentMethods(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };
  const actor = await getCurrentDbUser();

  const schoolId = field(formData, "schoolId");
  if (!schoolId) return { error: "ID da escola é obrigatório." };

  const iban = field(formData, "iban").replace(/\s/g, "").toUpperCase();
  const mbwayPhone = field(formData, "mbwayPhone").replace(/\s/g, "");
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return { error: "O IBAN não parece válido." };
  if (mbwayPhone && !/^9\d{8}$/.test(mbwayPhone)) return { error: "O número MB Way deve ter 9 dígitos e começar por 9." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const { error } = await out.client.from("SchoolPaymentSettings").upsert(
    {
      schoolId,
      ibanEnabled: Boolean(iban),
      iban: iban || null,
      ibanHolder: field(formData, "ibanHolder") || null,
      ibanHolderAddress: field(formData, "ibanHolderAddress") || null,
      bicSwift: field(formData, "bicSwift").toUpperCase() || null,
      revolutTag: field(formData, "revolutTag") || null,
      mbwayEnabled: Boolean(mbwayPhone),
      mbwayPhone: mbwayPhone || null,
      updatedByUserId: actor?.id ?? null,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "schoolId" }
  );
  if (error) return { error: error.message };

  revalidateSchoolTeam(schoolId);
  return { success: "Meios de pagamento guardados." };
}

/** Liga a conta Revolut da escola. A chave nunca volta ao browser nem aparece nos registos. */
export async function connectSchoolRevolut(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };
  const actor = await getCurrentDbUser();

  const schoolId = field(formData, "schoolId");
  const secretKey = field(formData, "secretKey");
  if (!schoolId || !secretKey) return { error: "Cola a chave secreta da Revolut." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? ""}`;
  const res = await connectSchoolMerchantAccount(out.client, { schoolId, secretKey, origin, actorUserId: actor?.id ?? null });
  if (res.error) return { error: res.error };

  revalidateSchoolTeam(schoolId);
  return { success: "Conta Revolut ligada." };
}

export async function disconnectSchoolRevolut(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };
  const actor = await getCurrentDbUser();

  const schoolId = field(formData, "schoolId");
  if (!schoolId) return { error: "ID da escola é obrigatório." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const res = await disconnectSchoolMerchantAccount(out.client, schoolId, actor?.id ?? null);
  if (res.error) return { error: res.error };

  revalidateSchoolTeam(schoolId);
  return { success: "Conta Revolut desligada." };
}

/** Guarda o certificado da Business API. Falta depois autorizar na Revolut (/api/revolut/connect). */
export async function saveSchoolBankCert(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };
  const actor = await getCurrentDbUser();

  const schoolId = field(formData, "schoolId");
  const clientId = field(formData, "clientId");
  const privateKey = field(formData, "privateKey");
  if (!schoolId || !clientId || !privateKey) return { error: "Preenche o ClientID e a chave privada." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? ""}`;
  const res = await saveSchoolBankCertificate(out.client, { schoolId, clientId, privateKey, origin, actorUserId: actor?.id ?? null });
  if (res.error) return { error: res.error };

  revalidateSchoolTeam(schoolId);
  return { success: "Certificado guardado. Falta autorizar na Revolut." };
}

export async function disconnectSchoolBankAction(_prev: SchoolResult, formData: FormData): Promise<SchoolResult> {
  const denied = await networkAdminError();
  if (denied) return { error: denied };

  const schoolId = field(formData, "schoolId");
  if (!schoolId) return { error: "ID da escola é obrigatório." };

  const out = getAdminClientOrNull();
  if (!out.client) return { error: "Configuração admin ausente." };

  const res = await disconnectSchoolBank(out.client, schoolId);
  if (res.error) return { error: res.error };

  revalidateSchoolTeam(schoolId);
  return { success: "Confirmação de transferências desligada." };
}
