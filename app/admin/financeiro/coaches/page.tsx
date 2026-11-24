import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getSchoolScope, hasNoSchool, scopedSchoolIds } from "@/lib/school-scope";
import { DEMO_SCHOOL_ID } from "@/lib/demo";
import { loadSchoolCoachMonth } from "@/lib/coach-revenue.server";
import { CoachPayoutRow, type CoachPayoutRowView } from "./CoachPayoutRow";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

const eur = (n: number) => `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string, style: "long" | "short" = "long"): string {
  const [y, m] = month.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-PT", { month: style, year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function AdminCoachPayoutsPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const scope = await getSchoolScope();
  if (hasNoSchool(scope)) redirect("/admin");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const db = result.client;

  const now = new Date();
  const current = ym(now);
  const lastClosed = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const params = await searchParams;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : lastClosed;
  const monthOptions = Array.from({ length: 12 }, (_, i) => ym(new Date(now.getFullYear(), now.getMonth() - i, 1)));

  const scoped = scopedSchoolIds(scope);
  const schoolIds = (scoped ?? scope.schools.map((s) => s.id)).filter((id) => id !== DEMO_SCHOOL_ID);
  const schoolName = new Map(scope.schools.map((s) => [s.id, s.name ?? s.id]));

  const [summaries, { data: payouts }, { data: refs }] = await Promise.all([
    Promise.all(schoolIds.map(async (id) => ({ schoolId: id, byCoach: await loadSchoolCoachMonth(db, id, month) }))),
    schoolIds.length
      ? db.from("CoachPayout").select("coachId, schoolId, amount, status, paidAt, paidByUserId").eq("referenceMonth", month).in("schoolId", schoolIds)
      : Promise.resolve({ data: [] as { coachId: string; schoolId: string; amount: number; status: string; paidAt: string | null; paidByUserId: string | null }[] }),
    db.from("ModalityRef").select("code, name"),
  ]);

  const coachIds = [...new Set(summaries.flatMap((s) => [...s.byCoach.keys()]))];
  const [{ data: coaches }, { data: mods }] = await Promise.all([
    coachIds.length ? db.from("Coach").select("id, userId").in("id", coachIds) : Promise.resolve({ data: [] as { id: string; userId: string }[] }),
    coachIds.length
      ? db.from("CoachModality").select("coachId, schoolId, modalityCode").in("coachId", coachIds)
      : Promise.resolve({ data: [] as { coachId: string; schoolId: string; modalityCode: string }[] }),
  ]);
  const payerIds = (payouts ?? []).map((p) => p.paidByUserId).filter(Boolean) as string[];
  const userIds = [...new Set([...(coaches ?? []).map((c) => c.userId as string), ...payerIds])];
  const { data: users } = userIds.length ? await db.from("User").select("id, name, email").in("id", userIds) : { data: [] as { id: string; name: string | null; email: string }[] };
  const userName = new Map((users ?? []).map((u) => [u.id as string, ((u.name as string | null)?.trim() || (u.email as string)) ?? "—"]));
  const coachUser = new Map((coaches ?? []).map((c) => [c.id as string, c.userId as string]));
  const modName = new Map((refs ?? []).map((r) => [r.code as string, r.name as string]));
  const payoutKey = (coachId: string, schoolId: string) => `${coachId}|${schoolId}`;
  const payoutBy = new Map((payouts ?? []).map((p) => [payoutKey(p.coachId as string, p.schoolId as string), p]));

  const sections = summaries.map(({ schoolId, byCoach }) => {
    const rows: CoachPayoutRowView[] = [...byCoach.values()].map((s) => {
      const p = payoutBy.get(payoutKey(s.coachId, schoolId));
      const isPaid = p?.status === "PAID";
      return {
        coachId: s.coachId,
        schoolId,
        month,
        name: userName.get(coachUser.get(s.coachId) ?? "") ?? "—",
        modalities: (mods ?? [])
          .filter((m) => m.coachId === s.coachId && m.schoolId === schoolId)
          .map((m) => modName.get(m.modalityCode as string) ?? m.modalityCode)
          .join(", "),
        studentCount: s.studentCount,
        received: s.received,
        forecast: s.forecast,
        canMark: month < current,
        paid: isPaid ? { at: p!.paidAt as string, by: userName.get(p!.paidByUserId as string) ?? "—", amount: Number(p!.amount) } : null,
      };
    });
    rows.sort((a, b) => Number(Boolean(a.paid)) - Number(Boolean(b.paid)) || b.received - a.received);
    const toPay = rows.filter((r) => !r.paid).reduce((a, r) => a + r.received, 0);
    return { schoolId, name: schoolName.get(schoolId) ?? schoolId, rows, toPay };
  });

  return (
    <div style={{ maxWidth: "min(860px, 100%)" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>A pagar a professores · {monthLabel(month)}</h1>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--text-secondary)" }}>
        {month < current
          ? "Mês fechado · pagamento até dia 10 do mês seguinte, contra recibo verde."
          : "Mês a decorrer · os valores ainda podem mudar; só se marca o pagamento depois de o mês fechar."}
      </p>

      <div style={{ marginBottom: 16, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {monthOptions.map((m) => (
          <Link
            key={m}
            href={`/admin/financeiro/coaches?month=${m}`}
            className="btn"
            style={{
              textDecoration: "none",
              fontSize: 13,
              padding: "4px 10px",
              whiteSpace: "nowrap",
              backgroundColor: m === month ? "var(--primary)" : "var(--bg-secondary)",
              color: m === month ? "#fff" : "var(--text-primary)",
            }}
          >
            {monthLabel(m, "short")}
          </Link>
        ))}
      </div>

      {sections.map((s) => (
        <section key={s.schoolId} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{s.name}</h2>
            <span style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
              Por pagar: <strong style={{ color: "var(--text-primary)" }}>{eur(s.toPay)}</strong>
            </span>
          </div>
          {s.rows.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              Sem professores com modalidades registadas nesta escola. As modalidades de cada professor definem-se ao aprovar o pedido de acesso.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {s.rows.map((r) => (
                <CoachPayoutRow key={r.coachId} row={r} />
              ))}
            </ul>
          )}
        </section>
      ))}

      <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
        Valores calculados pelas regras do contrato (preço de tabela sem IVA). Ao marcar como pago, o valor e o detalhe ficam guardados e o professor vê o
        pagamento no seu financeiro.
      </p>
    </div>
  );
}
