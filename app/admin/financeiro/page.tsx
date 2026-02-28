import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Pago",
  LATE: "Em atraso",
};

type SearchParams = Promise<{ status?: string }>;

export default async function AdminFinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const filterStatus = params.status ?? "all";

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: payments } = await supabase
    .from("Payment")
    .select("id, studentId, amount, status, referenceMonth, createdAt")
    .order("referenceMonth", { ascending: false })
    .order("createdAt", { ascending: false })
    .limit(200);

  const list = payments ?? [];
  let filtered = list;
  if (filterStatus !== "all") filtered = list.filter((p) => p.status === filterStatus);

  const studentIds = [...new Set(filtered.map((p) => p.studentId))];
  const { data: students } = await supabase.from("Student").select("id, userId").in("id", studentIds);
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Financeiro
        </h1>
        <Link
          href="/admin/financeiro/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Registar pagamento
        </Link>
      </div>

      <div style={{ marginBottom: "clamp(16px, 4vw, 20px)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link
          href="/admin/financeiro"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filterStatus === "all" ? "var(--primary)" : "var(--bg-secondary)",
            color: filterStatus === "all" ? "#fff" : "var(--text-primary)",
          }}
        >
          Todos
        </Link>
        <Link
          href="/admin/financeiro?status=PAID"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filterStatus === "PAID" ? "var(--primary)" : "var(--bg-secondary)",
            color: filterStatus === "PAID" ? "#fff" : "var(--text-primary)",
          }}
        >
          Pago
        </Link>
        <Link
          href="/admin/financeiro?status=LATE"
          className="btn"
          style={{
            textDecoration: "none",
            backgroundColor: filterStatus === "LATE" ? "var(--primary)" : "var(--bg-secondary)",
            color: filterStatus === "LATE" ? "#fff" : "var(--text-primary)",
          }}
        >
          Em atraso
        </Link>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {list.length === 0 ? "Nenhum registo de pagamento." : "Nenhum registo com este filtro."}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(10px, 2.5vw, 12px)",
          }}
        >
          {filtered.map((p) => {
            const u = studentToUser.get(p.studentId);
            return (
              <li key={p.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {u?.name || u?.email || "—"}
                  </span>
                  <span
                    style={{
                      fontSize: "clamp(12px, 3vw, 14px)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: p.status === "PAID" ? "var(--success)" : "var(--danger)",
                      color: "#fff",
                    }}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {p.referenceMonth} · {Number(p.amount).toFixed(2)} €
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
