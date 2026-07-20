import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { isGoalOverdue } from "@/lib/admin-business-goals";
import { listAdminGoals } from "./actions";
import { AdminGoalCard } from "./AdminGoalCard";
import { AdminGoalsFilters } from "./AdminGoalsFilters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ school?: string; status?: string }>;

export default async function AdminMetasPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const params = await searchParams;
  const goals = await listAdminGoals({
    schoolId: params.school ?? null,
    status: params.status ?? null,
  });

  const { data: schools } = await result.client.from("School").select("id, name").order("name");
  const schoolOptions = schools ?? [];

  const activeCount = goals.filter((g) => g.status === "ACTIVE").length;
  const overdueCount = goals.filter((g) => g.status === "ACTIVE" && isGoalOverdue(g)).length;
  const completedCount = goals.filter((g) => g.status === "COMPLETED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <Link href="/admin" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
            ← Início
          </Link>
          <h1 style={{ margin: "12px 0 4px", fontSize: 24, fontWeight: 600 }}>Metas</h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
            Acompanha objectivos quantitativos ou monetários — global ou por escola.
          </p>
        </div>
        <Link href="/admin/metas/novo" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Nova meta
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
        }}
      >
        <SummaryCard label="Activas" value={activeCount} />
        <SummaryCard label="Em atraso" value={overdueCount} highlight={overdueCount > 0} />
        <SummaryCard label="Concluídas" value={completedCount} />
        <SummaryCard label="Nesta lista" value={goals.length} />
      </div>

      <Suspense fallback={<p style={{ fontSize: 14, color: "var(--text-secondary)" }}>A carregar filtros…</p>}>
        <AdminGoalsFilters schools={schoolOptions} />
      </Suspense>

      {goals.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>Nenhuma meta encontrada.</p>
          <Link href="/admin/metas/novo" style={{ color: "var(--primary)", fontWeight: 600, marginTop: 12, display: "inline-block" }}>
            Criar primeira meta
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {goals.map((g) => (
            <AdminGoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="card" style={{ padding: 14, textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: highlight ? "var(--danger, #c00)" : "var(--text-primary)" }}>
        {value}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{label}</p>
    </div>
  );
}
