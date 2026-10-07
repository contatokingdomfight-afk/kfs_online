import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { DEFAULT_XP_RULES, isXpSource, type XpSource } from "@/lib/xp-rules";
import { XpRulesForm } from "./XpRulesForm";

export const dynamic = "force-dynamic";

export default async function AdminXpPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const { data } = await result.client.from("XpRule").select("source, xp");
  const rules: Record<XpSource, number> = { ...DEFAULT_XP_RULES };
  for (const r of data ?? []) if (isXpSource(r.source)) rules[r.source] = r.xp;

  return (
    <div style={{ maxWidth: "min(640px, 100%)" }}>
      <Link href="/admin" style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", fontWeight: 500, textDecoration: "none" }}>
        ← Admin
      </Link>
      <h1 style={{ margin: "var(--space-4) 0 8px", fontSize: "var(--text-xl)", fontWeight: 600 }}>Regras de XP</h1>
      <p style={{ margin: "0 0 var(--space-5)", fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Quanto XP vale cada atividade no ranking. O XP de presenças, avaliações de performance, cursos e exames fica associado à
        modalidade; as avaliações físicas (e cursos sem modalidade) contam como XP geral. As alterações aplicam-se a todo o histórico —
        o ranking é recalculado de imediato.
      </p>
      <XpRulesForm rules={rules} />
    </div>
  );
}
