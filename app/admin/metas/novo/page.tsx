import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { AdminGoalForm } from "../AdminGoalForm";

export default async function AdminMetasNovoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const { data: schools } = await result.client.from("School").select("id, name").order("name");

  return (
    <div style={{ maxWidth: 520 }}>
      <Link href="/admin/metas" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
        ← Metas
      </Link>
      <h1 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 600 }}>Nova meta</h1>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-secondary)" }}>
        Define o objectivo, o tipo e o prazo. Os lançamentos de progresso são feitos na página da meta.
      </p>
      <AdminGoalForm schools={schools ?? []} />
    </div>
  );
}
