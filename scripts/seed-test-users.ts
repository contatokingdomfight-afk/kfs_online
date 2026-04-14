/**
 * Cria ou atualiza utilizadores de teste (Auth + tabelas User / Student / Coach).
 * Requer: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_SEED_PASSWORD
 *
 * Uso: npm run seed:test-users
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

// .env primeiro; .env.local sobrescreve (comportamento típico Next.js)
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const EMAIL_ADMIN = "kfs.test.admin@local.test";
const EMAIL_COACH = "kfs.test.coach@local.test";
const EMAIL_ALUNO = "kfs.test.aluno@local.test";
/** Aluno com plano + Athlete para demo (ex.: investidor ver o perfil completo). */
const EMAIL_INVESTIDOR_DEMO = "demo@teste.com";

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
    user_metadata: { full_name: email.split("@")[0].replace(/\./g, " ") },
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
  role: "ADMIN" | "COACH" | "ALUNO"
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

async function ensureStudent(supabase: SupabaseClient, userId: string, schoolId: string, opts: { noPlan: boolean }) {
  const { data: st } = await supabase.from("Student").select("id").eq("userId", userId).maybeSingle();
  if (st?.id) {
    if (opts.noPlan) {
      await supabase.from("Student").update({ planId: null }).eq("id", st.id);
    }
    await ensureStudentProfile(supabase, st.id);
    return st.id;
  }
  const studentId = crypto.randomUUID();
  const { error } = await supabase.from("Student").insert({
    id: studentId,
    userId,
    schoolId,
    status: "ATIVO",
    ...(opts.noPlan ? { planId: null } : {}),
  });
  if (error) throw error;
  await ensureStudentProfile(supabase, studentId);
  return studentId;
}

/** Aluno com plano ativo (se existir) + modalidade, para aceder a /dashboard/performance, etc. */
async function ensureInvestorDemoStudent(supabase: SupabaseClient, userId: string, schoolId: string) {
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
      "[seed] Nenhum plano ativo para a escola do demo investidor — o aluno ficará sem planId (performance pode estar limitada)."
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

/** Registo Athlete + XP de demo para gamificação no perfil. */
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

async function ensureCoach(supabase: SupabaseClient, userId: string, schoolId: string) {
  const { data: c } = await supabase.from("Coach").select("id").eq("userId", userId).maybeSingle();
  if (c?.id) return c.id;
  const coachId = crypto.randomUUID();
  const { error } = await supabase.from("Coach").insert({
    id: coachId,
    userId,
    is_active: true,
  });
  if (error) throw error;
  const { error: csErr } = await supabase.from("CoachSchool").insert({ coachId, schoolId });
  if (csErr) throw csErr;
  return coachId;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.TEST_SEED_PASSWORD?.trim();
  /** Password só para a conta demo investidor; se vazio, usa TEST_SEED_PASSWORD. */
  const investorPassword =
    process.env.INVESTOR_DEMO_PASSWORD?.trim() || password;

  if (!url || !key) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (.env.local).");
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("Defina TEST_SEED_PASSWORD no .env ou .env.local (mín. 8 caracteres).");
    process.exit(1);
  }
  if (!investorPassword || investorPassword.length < 8) {
    console.error("Password do investidor inválida (use INVESTOR_DEMO_PASSWORD ou TEST_SEED_PASSWORD).");
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
    console.error("Nenhuma escola ativa (School). Crie uma escola na admin ou na BD antes do seed.");
    process.exit(1);
  }

  const schoolId = school.id;

  // --- Admin (só User; não precisa de Coach para /admin) ---
  const authAdmin = await getOrCreateAuthUser(supabase, EMAIL_ADMIN, password);
  await ensureUserRow(supabase, authAdmin, EMAIL_ADMIN, "Test Admin", "ADMIN");

  // --- Coach ---
  const authCoach = await getOrCreateAuthUser(supabase, EMAIL_COACH, password);
  const userCoachId = await ensureUserRow(supabase, authCoach, EMAIL_COACH, "Test Coach", "COACH");
  await ensureCoach(supabase, userCoachId, schoolId);

  // --- Aluno sem plano (cenário aula livre / free tier) ---
  const authAluno = await getOrCreateAuthUser(supabase, EMAIL_ALUNO, password);
  const userAlunoId = await ensureUserRow(supabase, authAluno, EMAIL_ALUNO, "Test Aluno", "ALUNO");
  await ensureStudent(supabase, userAlunoId, schoolId, { noPlan: true });

  // --- Demo investidor: aluno com plano + Athlete (perfil atleta / performance) ---
  const authInvestidor = await getOrCreateAuthUser(supabase, EMAIL_INVESTIDOR_DEMO, investorPassword);
  const userInvestidorId = await ensureUserRow(
    supabase,
    authInvestidor,
    EMAIL_INVESTIDOR_DEMO,
    "Demo Investidor",
    "ALUNO"
  );
  await ensureInvestorDemoStudent(supabase, userInvestidorId, schoolId);

  console.log("Contas de teste prontas (password base = TEST_SEED_PASSWORD):");
  console.log(`  Admin: ${EMAIL_ADMIN}`);
  console.log(`  Coach: ${EMAIL_COACH}`);
  console.log(`  Aluno (sem plano): ${EMAIL_ALUNO}`);
  console.log("");
  console.log("--- Conta demo (investidor / visita guiada) ---");
  console.log(`  Email:    ${EMAIL_INVESTIDOR_DEMO}`);
  console.log(
    `  Password: ${process.env.INVESTOR_DEMO_PASSWORD?.trim() ? "(definida em INVESTOR_DEMO_PASSWORD)" : "(igual a TEST_SEED_PASSWORD)"}`
  );
  console.log("  Login: /sign-in → dashboard → Perfil do atleta / performance");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
