import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getShopAcademyStats } from "@/lib/admin-shop-academy-stats";

const eur = (v: number) => `${Math.round(v).toLocaleString("pt-PT")} €`;

/** Cartão da página «Hoje»: receita do mês da Loja e da Academy (carrega à parte, sem bloquear a página). */
export async function ShopAcademyTodayCard({ client, schoolId }: { client: SupabaseClient; schoolId: string | null }) {
  const { totals } = (await getShopAcademyStats(client, schoolId));
  const up = (totals.deltaPct ?? 0) >= 0;
  return (
    <Link href="/admin/dashboard/loja-academy" className="card" style={{ padding: 14, textDecoration: "none", color: "var(--text-primary)", display: "block" }}>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{eur(totals.month)}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        Loja &amp; Academy este mês{" "}
        {totals.deltaPct != null ? (
          <span style={{ fontWeight: 700, color: up ? "var(--success)" : "var(--danger)" }}>
            {up ? "▲" : "▼"} {Math.abs(totals.deltaPct)}%
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
        Loja {eur(totals.loja)} · Cursos {eur(totals.cursos)} · Passes {eur(totals.passes)}
      </div>
    </Link>
  );
}
