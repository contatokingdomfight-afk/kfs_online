/**
 * Cria ou atualiza o aluno demo2@gmail.com (Auth + User + Student com plano + Athlete).
 * Requer: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Password: DEMO2_SEED_PASSWORD ou 123456789 (mín. 8 caracteres; Supabase exige força mínima — 123456789 cumpre).
 *
 * Uso: npm run seed:demo2
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

if (
  (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") &&
  process.env.ALLOW_PRODUCTION_SEED !== "true"
) {
  console.error("Seed bloqueado em produção. Define ALLOW_PRODUCTION_SEED=true para forçar.");
  process.exit(1);
}

const DEMO2_EMAIL = "demo2@gmail.com";
const DEFAULT_DEMO2_PASSWORD = "123456789";

async function getOrCreateAuthUser(supabase: SupabaseClient, email: string, password: string): Promise<string> {
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const upd = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (upd.error) throw upd.error;
    return existing.id;
  }
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Demo 2" },
  });
  if (created.error) throw created.error;
  const id = created.data.user?.id;
  if (!id) throw new Error(`Auth: utilizador não criado para ${email}`);
  return id;
}

async function ensureUserRow(
  supabase: SupabaseClient,
  authUserId: string,
  email: string,
  name: string,
  role: "ALUNO"
): Promise<string> {
  const { data: row } = await supabase.from("User").select("id").eq("authUserId", authUserId).maybeSingle();
  if (row?.id) {
    await supabase.from("User").update({ email, name, role }).eq("id", row.id);
    return row.id;
  }
  const id = crypto.randomUUID();
  const { error } = await supabase.from("User").insert({
    id,
    authUserId,
    email,
    name,
    role,
  });
  if (error) throw error;
  return id;
}

async function ensureStudentProfile(supabase: SupabaseClient, studentId: string) {
  const { data: p } = await supabase.from("StudentProfile").select("id").eq("studentId", studentId).maybeSingle();
  if (p) return;
  await supabase.from("StudentProfile").insert({
    id: crypto.randomUUID(),
    studentId,
    hasCompletedOnboarding: true,
  });
}

/** Aluno com plano (se existir) + modalidade, Athlete; mesmo padrão que demo investidor. */
async function ensureInvestorStyleStudent(supabase: SupabaseClient, userId: string, schoolId: string) {
  const { data: plan } = await supabase
    .from("Plan")
    .select("id")
    .eq("schoolId", schoolId)
    .eq("isActive", true)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: st } = await supabase.from("Student").select("id").eq("userId", userId).maybeSingle();
  if (!plan?.id) {
    console.warn(
      "[seed:demo2] Nenhum plano ativo para a escola — o aluno pode ficar sem planId (atribuições/performance limitadas)."
    );
  }

  if (st?.id) {
    const upd: Record<string, unknown> = { primaryModality: "MUAY_THAI" };
    if (plan?.id) upd.planId = plan.id;
    await supabase.from("Student").update(upd).eq("id", st.id);
    await ensureStudentProfile(supabase, st.id);
    await ensureAthleteForStudent(supabase, st.id);
    return st.id;
  }

  const studentId = crypto.randomUUID();
  const row: Record<string, unknown> = {
    id: studentId,
    userId,
    schoolId,
    status: "ATIVO",
    primaryModality: "MUAY_THAI",
  };
  if (plan?.id) row.planId = plan.id;

  const { error } = await supabase.from("Student").insert(row);
  if (error) throw error;
  await ensureStudentProfile(supabase, studentId);
  await ensureAthleteForStudent(supabase, studentId);
  return studentId;
}

async function ensureAthleteForStudent(supabase: SupabaseClient, studentId: string) {
  const { data: existing } = await supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle();
  if (existing?.id) return;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const full = {
    id,
    studentId,
    xp: 3200,
    displayBeltIndex: 1,
    lastBeltPromotionAt: now,
  };
  let { error } = await supabase.from("Athlete").insert(full);
  if (
    error &&
    (error.message?.includes("displayBeltIndex") ||
      error.message?.includes("lastBeltPromotionAt") ||
      error.code === "PGRST204")
  ) {
    ({ error } = await supabase.from("Athlete").insert({ id, studentId, xp: 3200 }));
  }
  if (error) throw error;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = (process.env.DEMO2_SEED_PASSWORD ?? DEFAULT_DEMO2_PASSWORD).trim();

  if (!url || !key) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (.env.local).");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("DEMO2_SEED_PASSWORD tem de ter no mínimo 8 caracteres (Supabase).");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: school, error: schoolErr } = await supabase
    .from("School")
    .select("id")
    .eq("isActive", true)
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (schoolErr) throw schoolErr;
  if (!school?.id) {
    console.error("Nenhuma escola ativa (School).");
    process.exit(1);
  }

  const authId = await getOrCreateAuthUser(supabase, DEMO2_EMAIL, password);
  const userId = await ensureUserRow(supabase, authId, DEMO2_EMAIL, "Demo 2", "ALUNO");
  await ensureInvestorStyleStudent(supabase, userId, school.id);

  console.log("Conta demo2 pronta:");
  console.log(`  Email:    ${DEMO2_EMAIL}`);
  console.log(`  Password: ${process.env.DEMO2_SEED_PASSWORD ? "(DEMO2_SEED_PASSWORD)" : DEFAULT_DEMO2_PASSWORD}`);
  console.log("  Login: /sign-in");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
