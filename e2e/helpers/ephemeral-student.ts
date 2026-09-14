import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

export function getTestPassword(): string {
  return process.env.TEST_SEED_PASSWORD ?? process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";
}

export function hasSignupTestEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      getTestPassword()
  );
}

export function ephemeralEmail(): string {
  return `kfs.e2e.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@local.test`;
}

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env em falta");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Só Auth — simula conta recém-criada antes do primeiro syncUser. */
export async function createAuthOnlyStudent(
  email: string,
  password: string,
  fullName: string
): Promise<string> {
  const supabase = adminClient();
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.error) throw created.error;
  const authUserId = created.data.user?.id;
  if (!authUserId) throw new Error("Auth user não criado");
  return authUserId;
}

/** Remove User/Student/Profile associados e utilizador Auth (contas @local.test e2e). */
export async function deleteEphemeralStudent(email: string): Promise<void> {
  const supabase = adminClient();

  const { data: userRow } = await supabase.from("User").select("id, authUserId").eq("email", email).maybeSingle();
  if (userRow?.id) {
    const { data: student } = await supabase.from("Student").select("id").eq("userId", userRow.id).maybeSingle();
    if (student?.id) {
      await supabase.from("StudentProfile").delete().eq("studentId", student.id);
      await supabase.from("StudentWaiver").delete().eq("studentId", student.id);
      await supabase.from("StudentEnrollmentForm").delete().eq("studentId", student.id);
      await supabase.from("StudentMembershipAgreement").delete().eq("studentId", student.id);
      await supabase.from("Student").delete().eq("id", student.id);
    }
    await supabase.from("User").delete().eq("id", userRow.id);
  }

  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (list.error) throw list.error;
  const authUser = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (authUser) {
    const del = await supabase.auth.admin.deleteUser(authUser.id);
    if (del.error) throw del.error;
  }
}
