/**
 * Cria ou atualiza utilizadores de teste (Auth + tabelas User / Student / Coach).
 * Requer: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_SEED_PASSWORD
 *
 * Uso: npm run seed:test-users
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const EMAIL_ADMIN = "kfs.test.admin@local.test";
const EMAIL_COACH = "kfs.test.coach@local.test";
const EMAIL_ALUNO = "kfs.test.aluno@local.test";

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

async function ensureCoach(supabase: SupabaseClient, userId: string, schoolId: string) {
  const { data: c } = await supabase.from("Coach").select("id").eq("userId", userId).maybeSingle();
  if (c?.id) return c.id;
  const coachId = crypto.randomUUID();
  const { error } = await supabase.from("Coach").insert({
    id: coachId,
    userId,
    schoolId,
    is_active: true,
  });
  if (error) throw error;
  return coachId;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.TEST_SEED_PASSWORD?.trim();

  if (!url || !key) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (.env.local).");
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("Defina TEST_SEED_PASSWORD no .env.local (mín. 8 caracteres).");
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

  console.log("Contas de teste prontas (mesma password = TEST_SEED_PASSWORD):");
  console.log(`  Admin: ${EMAIL_ADMIN}`);
  console.log(`  Coach: ${EMAIL_COACH}`);
  console.log(`  Aluno: ${EMAIL_ALUNO}`);
  console.log("Login: /sign-in");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
