import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { NovoPagamentoForm } from "./NovoPagamentoForm";

export default async function AdminFinanceiroNovoPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const { data: students } = await supabase.from("Student").select("id, userId").order("id");
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const options = (students ?? []).map((s) => ({
    id: s.id,
    label: userById.get(s.userId)?.name || userById.get(s.userId)?.email || s.id,
  }));

  const refMonth = new Date();
  const defaultRef = `${refMonth.getFullYear()}-${String(refMonth.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/financeiro"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Registar pagamento
      </h1>
      <NovoPagamentoForm studentOptions={options} defaultReferenceMonth={defaultRef} />
    </div>
  );
}
