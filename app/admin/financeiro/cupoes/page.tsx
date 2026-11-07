import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getSchoolScope, isNetworkScope, scopedSchoolIds } from "@/lib/school-scope";
import {
  COUPON_SELECT,
  COUPON_STATUS_LABEL,
  COUPON_TARGET_LABEL,
  couponStatus,
  couponSummary,
  toCouponRow,
  type CouponStatus,
  type CouponTarget,
} from "@/lib/coupons/rules";
import { CouponCreateForm } from "./CouponCreateForm";
import { updateCouponAdmin } from "./actions";

export const dynamic = "force-dynamic";

const btn: React.CSSProperties = { minHeight: 32, padding: "0 11px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };

const PILL: Record<CouponStatus, { bg: string; fg: string }> = {
  ACTIVE: { bg: "rgba(74,222,128,0.16)", fg: "var(--success)" },
  SCHEDULED: { bg: "rgba(96,165,250,0.16)", fg: "#60a5fa" },
  PAUSED: { bg: "rgba(245,158,11,0.16)", fg: "#f59e0b" },
  EXHAUSTED: { bg: "var(--bg-secondary)", fg: "var(--text-secondary)" },
  EXPIRED: { bg: "var(--bg-secondary)", fg: "var(--text-secondary)" },
  ENDED: { bg: "var(--bg-secondary)", fg: "var(--text-secondary)" },
};

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const day = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric" });

function OpButton({ id, op, label, danger }: { id: string; op: string; label: string; danger?: boolean }) {
  return (
    <form action={updateCouponAdmin}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <button type="submit" style={danger ? { ...btn, background: "var(--danger)", border: "1px solid var(--danger)", color: "#fff" } : btn}>
        {label}
      </button>
    </form>
  );
}

function Confirm({ id, op, label, confirm, danger }: { id: string; op: string; label: string; confirm: string; danger?: boolean }) {
  return (
    <details>
      <summary style={{ ...btn, listStyle: "none", display: "inline-flex", alignItems: "center", color: danger ? "var(--danger)" : "var(--text-secondary)" }}>{label}</summary>
      <div style={{ marginTop: 6 }}>
        <OpButton id={id} op={op} label={confirm} danger />
      </div>
    </details>
  );
}

export default async function CupoesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const scope = await getSchoolScope();
  const ids = scopedSchoolIds(scope);
  let q = supabase.from("RetailCoupon").select(COUPON_SELECT).order("createdAt", { ascending: false });
  if (ids) q = ids.length ? q.or(`schoolId.in.(${ids.join(",")}),schoolId.is.null`) : q.is("schoolId", null);
  const { data } = await q;
  const coupons = ((data ?? []) as Record<string, unknown>[]).map(toCouponRow);

  const { data: redRows } = coupons.length
    ? await supabase
        .from("CouponRedemption")
        .select("couponId, personKey, studentId, target, discountAmount, createdAt")
        .in("couponId", coupons.map((c) => c.id))
        .order("createdAt", { ascending: false })
    : { data: [] };
  const reds = (redRows ?? []) as { couponId: string; personKey: string; studentId: string | null; target: CouponTarget; discountAmount: number | string; createdAt: string }[];

  // Nomes de quem usou (aluno → utilizador).
  const studentIds = [...new Set(reds.map((r) => r.studentId).filter((x): x is string => !!x))];
  const { data: students } = studentIds.length ? await supabase.from("Student").select("id, userId").in("id", studentIds) : { data: [] };
  const userIds = ((students ?? []) as { id: string; userId: string | null }[]).map((s) => s.userId).filter((x): x is string => !!x);
  const { data: users } = userIds.length ? await supabase.from("User").select("id, name").in("id", userIds) : { data: [] };
  const userName = new Map(((users ?? []) as { id: string; name: string | null }[]).map((u) => [u.id, u.name ?? ""]));
  const studentName = new Map(((students ?? []) as { id: string; userId: string | null }[]).map((s) => [s.id, (s.userId && userName.get(s.userId)) || "Aluno"]));

  const stats = new Map<string, { people: Set<string>; total: number; uses: typeof reds }>();
  for (const r of reds) {
    if (!stats.has(r.couponId)) stats.set(r.couponId, { people: new Set(), total: 0, uses: [] });
    const s = stats.get(r.couponId)!;
    s.people.add(r.personKey);
    s.total += Number(r.discountAmount);
    s.uses.push(r);
  }
  const totalUses = [...stats.values()].reduce((t, s) => t + s.people.size, 0);
  const totalDiscount = [...stats.values()].reduce((t, s) => t + s.total, 0);
  const network = isNetworkScope(scope);
  const needsSchool = scope.kind !== "none" && !scope.selectedSchoolId && scope.schools.length > 1;

  return (
    <div style={{ maxWidth: "min(960px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 700 }}>Cupões de desconto</h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
          O aluno escreve o código no pagamento da adesão, no Financeiro (mensalidades) ou na loja. {coupons.length} cupões · {totalUses} pessoas ·{" "}
          {eur(totalDiscount)} descontados.
        </p>
      </div>

      {needsSchool ? (
        <p className="card" style={{ margin: 0, padding: "10px 14px", fontSize: 13.5, color: "var(--text-secondary)" }}>
          Para criar um cupão, escolhe primeiro a escola no seletor do topo (os cupões são por escola).
        </p>
      ) : (
        <CouponCreateForm />
      )}

      {coupons.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Ainda sem cupões.</p>
      ) : (
        coupons.map((c) => {
          const s = stats.get(c.id);
          const people = s?.people.size ?? 0;
          const status = couponStatus(c, people);
          const pill = PILL[status];
          const used = people > 0;
          const editable = c.schoolId != null || network;
          const validity = c.startsAt || c.endsAt ? `${c.startsAt ? day(c.startsAt) : "…"} – ${c.endsAt ? day(c.endsAt) : "sem fim"}` : "Sem datas";
          return (
            <div key={c.id} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontFamily: "monospace", fontSize: 15 }}>{c.code}</strong>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: pill.bg, color: pill.fg }}>{COUPON_STATUS_LABEL[status]}</span>
                    {c.name ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{c.name}</span> : null}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
                    −{couponSummary(c)} · {validity} · {people}
                    {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""} pessoas · −{eur(s?.total ?? 0)}
                    {c.schoolId == null ? " · cupão antigo da loja (todas as escolas)" : ""}
                  </div>
                </div>
                {editable && status !== "ENDED" ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {c.isActive ? <OpButton id={c.id} op="pause" label="Pausar" /> : <OpButton id={c.id} op="resume" label="Retomar" />}
                    {used ? (
                      <Confirm id={c.id} op="end" label="Encerrar" confirm="Confirmar encerrar" />
                    ) : (
                      <Confirm id={c.id} op="delete" label="Apagar" confirm="Confirmar apagar" danger />
                    )}
                  </div>
                ) : null}
              </div>
              {s?.uses.length ? (
                <details>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>Ver usos ({s.uses.length})</summary>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, display: "flex", flexDirection: "column", gap: 3 }}>
                    {s.uses.map((u, i) => (
                      <li key={i}>
                        {u.studentId ? studentName.get(u.studentId) : "Cliente da loja"} · {COUPON_TARGET_LABEL[u.target]} · −{eur(Number(u.discountAmount))} · {day(u.createdAt)}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
