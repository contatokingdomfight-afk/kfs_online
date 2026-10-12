import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { couponLabel } from "@/lib/retail/discounts";
import { CouponForm, PromotionForm } from "./PromoForms";
import { updateDiscount } from "./actions";

export const dynamic = "force-dynamic";

const btn: React.CSSProperties = { minHeight: 34, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" };

function Toggle({ table, id, active }: { table: "promotion" | "coupon"; id: string; active: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <form action={updateDiscount}>
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="op" value={active ? "off" : "on"} />
        <button type="submit" style={active ? btn : { ...btn, background: "var(--primary)", border: "1px solid var(--primary)", color: "#fff" }}>
          {active ? "Desligar" : "Ligar"}
        </button>
      </form>
      <details>
        <summary style={{ ...btn, listStyle: "none", display: "inline-flex", alignItems: "center", color: "var(--text-secondary)" }}>Apagar</summary>
        <form action={updateDiscount} style={{ marginTop: 6 }}>
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="op" value="delete" />
          <button type="submit" style={{ ...btn, background: "var(--danger)", border: "1px solid var(--danger)", color: "#fff" }}>
            Confirmar
          </button>
        </form>
      </details>
    </div>
  );
}

const pill = (on: boolean): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: on ? "rgba(74,222,128,0.16)" : "var(--bg-secondary)", color: on ? "var(--success)" : "var(--text-secondary)" });

export default async function PromocoesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: promos }, { data: coupons }, { data: products }, { data: usedRows }] = await Promise.all([
    supabase.from("RetailPromotion").select("id, name, productId, minQuantity, percentOff, isActive").order("createdAt", { ascending: false }),
    supabase.from("RetailCoupon").select("id, code, kind, value, isActive").order("createdAt", { ascending: false }),
    supabase.from("Product").select("id, name").eq("isActive", true).order("name"),
    supabase.from("RetailOrder").select("couponCode, promotionId, discountAmount").neq("status", "CANCELLED").gt("discountAmount", 0),
  ]);
  const productName = new Map(((products ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const uses = (key: (r: { couponCode: string | null; promotionId: string | null }) => boolean) => {
    const rows = ((usedRows ?? []) as { couponCode: string | null; promotionId: string | null; discountAmount: number | string }[]).filter(key);
    return { n: rows.length, total: rows.reduce((a, r) => a + Number(r.discountAmount), 0) };
  };

  return (
    <div style={{ maxWidth: "min(900px, 100%)", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <Link href="/admin/loja" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
          ← Loja
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 700 }}>Promoções e cupões</h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
          Valem nas encomendas da loja. Se houver promoção e cupão ao mesmo tempo, aplica-se só o desconto maior.
        </p>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Promoções</h2>
        {(promos ?? []).length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Ainda sem promoções.</p>
        ) : (
          ((promos ?? []) as { id: string; name: string; productId: string | null; minQuantity: number; percentOff: number | string; isActive: boolean }[]).map((p) => {
            const u = uses((r) => r.promotionId === p.id);
            return (
              <div key={p.id} className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{p.name}</strong>
                    <span style={pill(p.isActive)}>{p.isActive ? "Ativa" : "Desligada"}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                    {Number(p.percentOff)}% a partir de {p.minQuantity} peças · {p.productId ? productName.get(p.productId) ?? "produto" : "toda a loja"} · usada {u.n}× (−{u.total.toFixed(0)} €)
                  </div>
                </div>
                <Toggle table="promotion" id={p.id} active={p.isActive} />
              </div>
            );
          })
        )}
        <PromotionForm products={(products ?? []) as { id: string; name: string }[]} />
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Cupões</h2>
        {(coupons ?? []).length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Ainda sem cupões.</p>
        ) : (
          ((coupons ?? []) as { id: string; code: string; kind: "PERCENT" | "FIXED"; value: number | string; isActive: boolean }[]).map((c) => {
            const u = uses((r) => r.couponCode === c.code);
            return (
              <div key={c.id} className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontFamily: "monospace", fontSize: 15 }}>{c.code}</strong>
                    <span style={pill(c.isActive)}>{c.isActive ? "Ativo" : "Desligado"}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                    −{couponLabel({ code: c.code, kind: c.kind, value: Number(c.value) })} · usado {u.n}× (−{u.total.toFixed(0)} €)
                  </div>
                </div>
                <Toggle table="coupon" id={c.id} active={c.isActive} />
              </div>
            );
          })
        )}
        <CouponForm />
      </section>
    </div>
  );
}
