import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCachedSchools } from "@/lib/cached-reference-data";
import { getShopAcademyStats } from "@/lib/admin-shop-academy-stats";
import { AdminSchoolFilter } from "../../AdminSchoolFilter";

export const dynamic = "force-dynamic";

type Vista = "loja" | "academy" | "cursos";
const VISTAS: { id: Vista; label: string }[] = [
  { id: "loja", label: "Loja" },
  { id: "academy", label: "Academy" },
  { id: "cursos", label: "Cursos" },
];

const eur = (v: number) => `${v.toLocaleString("pt-PT", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;

function Delta({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: up ? "var(--success)" : "var(--danger)" }}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

function Kpi({ value, label, extra }: { value: ReactNode; label: string; extra?: ReactNode }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
        {label} {extra}
      </div>
    </div>
  );
}

const ROW: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 14 };
const FIRST: CSSProperties = { borderTop: 0 };
const GRID: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: 10 };
const GRID2: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 12 };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card" style={{ padding: 16 }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>{title}</h3>
      {children}
    </section>
  );
}

export default async function LojaAcademyDashboardPage({ searchParams }: { searchParams: Promise<{ vista?: string; school?: string }> }) {
  const sp = await searchParams;
  const vista: Vista = sp.vista === "academy" || sp.vista === "cursos" ? sp.vista : "loja";
  const schoolId = sp.school?.trim() || null;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const [schools, s] = await Promise.all([getCachedSchools(result.client), getShopAcademyStats(result.client, schoolId)]);
  const qs = (v: Vista) => `?vista=${v}${schoolId ? `&school=${schoolId}` : ""}`;
  const maxMonth = Math.max(1, ...s.loja.monthly.map((m) => m.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, maxWidth: 1100 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Relatórios</h1>
        <AdminSchoolFilter schools={schools} currentSchoolId={schoolId} />
      </div>

      <nav aria-label="Relatórios" style={{ display: "flex", gap: 6, overflowX: "auto" }}>
        <Link href="/admin/dashboard" className="btn" style={{ textDecoration: "none", flexShrink: 0 }}>
          Escola
        </Link>
        <span className="btn btn-primary" style={{ flexShrink: 0 }}>
          Loja &amp; Academy
        </span>
      </nav>
      <nav aria-label="Vista" style={{ display: "flex", gap: 8, overflowX: "auto", alignItems: "center" }}>
        {VISTAS.map((v) => {
          const on = v.id === vista;
          return (
            <Link
              key={v.id}
              href={qs(v.id)}
              style={{
                flexShrink: 0,
                height: 36,
                display: "inline-flex",
                alignItems: "center",
                padding: "0 14px",
                borderRadius: 999,
                border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`,
                background: on ? "var(--text-primary)" : "transparent",
                color: on ? "var(--bg)" : "var(--text-primary)",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {v.label}
            </Link>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-secondary)", flexShrink: 0 }}>{s.monthLabel}</span>
      </nav>

      {vista === "loja" ? (
        <>
          <div style={GRID}>
            <Kpi value={eur(s.loja.revenue)} label="receita da loja" extra={<Delta pct={s.loja.revenueDeltaPct} />} />
            <Kpi
              value={s.loja.sales}
              label="vendas"
              extra={
                s.loja.salesDelta !== 0 ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.loja.salesDelta > 0 ? "var(--success)" : "var(--danger)" }}>
                    {s.loja.salesDelta > 0 ? "▲" : "▼"} {Math.abs(s.loja.salesDelta)}
                  </span>
                ) : null
              }
            />
            <Kpi value={eur(s.loja.avgTicket)} label="ticket médio" />
            <Kpi value={s.loja.ordersAwaitingPayment + s.loja.ordersToOrder + s.loja.ordersReady} label="encomendas por tratar" />
          </div>
          <div style={GRID2}>
            <Section title="Receita por mês">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, paddingBottom: 20 }}>
                {s.loja.monthly.map((m) => (
                  <div key={m.key} title={`${m.label}: ${eur(m.value)}`} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", position: "relative" }}>
                    <div style={{ width: "100%", height: `${Math.max(2, (m.value / maxMonth) * 100)}%`, background: "var(--primary)", borderRadius: "6px 6px 0 0" }} />
                    <span style={{ position: "absolute", bottom: -18, fontSize: 11, color: "var(--text-secondary)" }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Por tratar">
              <Link href="/admin/loja/encomendas" style={{ color: "inherit", textDecoration: "none" }}>
                <div style={{ ...ROW, ...FIRST }}>
                  <span>Aguardam pagamento</span>
                  <strong>{s.loja.ordersAwaitingPayment}</strong>
                </div>
                <div style={ROW}>
                  <span>A encomendar ao fornecedor</span>
                  <strong>{s.loja.ordersToOrder}</strong>
                </div>
                <div style={ROW}>
                  <span>Prontas para entregar</span>
                  <strong>{s.loja.ordersReady}</strong>
                </div>
              </Link>
            </Section>
          </div>
          <Section title="Produtos mais vendidos (este mês)">
            {s.loja.topProducts.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Sem vendas este mês.</p>
            ) : (
              s.loja.topProducts.map((p, i) => (
                <div key={p.name} style={i === 0 ? { ...ROW, ...FIRST } : ROW}>
                  <span>{p.name}</span>
                  <strong>
                    {p.units} un · {eur(p.revenue)}
                  </strong>
                </div>
              ))
            )}
          </Section>
        </>
      ) : null}

      {vista === "academy" ? (
        <>
          <div style={GRID}>
            <Kpi value={eur(s.academy.coursesRevenue)} label="cursos avulsos" extra={<Delta pct={s.academy.coursesRevenueDeltaPct} />} />
            <Kpi value={s.academy.activePasses} label="passes ativos" />
            <Kpi value={`+${s.academy.newPasses} / -${s.academy.cancelledPasses}`} label="passes novos / cancelados" />
            <Kpi value={eur(s.academy.mrr)} label="receita mensal dos passes (estimada)" />
          </div>
          <div style={GRID2}>
            <Section title="Origem da receita">
              <div style={{ ...ROW, ...FIRST }}>
                <span>Cursos avulsos ({s.academy.coursePurchases} compras)</span>
                <strong>{eur(s.academy.coursesRevenue)}</strong>
              </div>
              <div style={ROW}>
                <span>Passe mensal ({s.academy.passesMonthly})</span>
                <strong>{eur(s.academy.passesMonthly * 12)}</strong>
              </div>
              <div style={ROW}>
                <span>Passe anual ({s.academy.passesYearly})</span>
                <strong>{eur(Math.round((s.academy.passesYearly * 99) / 12))} /mês</strong>
              </div>
            </Section>
            <Section title="Compradores de cursos (este mês)">
              <div style={{ ...ROW, ...FIRST }}>
                <span>Contas só-loja</span>
                <strong>{s.academy.shopOnlyBuyers}</strong>
              </div>
              <div style={ROW}>
                <span>Alunos da escola</span>
                <strong>{s.academy.schoolBuyers}</strong>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>Contas só-loja não contam como alunos.</p>
            </Section>
          </div>
        </>
      ) : null}

      {vista === "cursos" ? (
        <>
          <div style={GRID}>
            <Kpi value={s.cursos.published} label="cursos publicados" />
            <Kpi value={s.cursos.salesThisMonth} label="vendas no mês" />
            <Kpi value={s.cursos.avgCompletionPct != null ? `${s.cursos.avgCompletionPct}%` : "—"} label="conclusão média" />
            <Kpi value={eur(s.cursos.commissionsPending)} label="comissões a pagar a professores" />
          </div>
          <Section title="Por curso">
            {s.cursos.perCourse.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Sem cursos publicados.</p>
            ) : (
              s.cursos.perCourse.map((c, i) => (
                <div key={c.id} style={{ ...ROW, flexDirection: "column", gap: 4, ...(i === 0 ? FIRST : null) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <Link href={`/admin/cursos/${c.id}`} style={{ color: "inherit", fontWeight: 700, textDecoration: "none" }}>
                      {c.name}
                    </Link>
                    <strong>{c.revenueMonth > 0 ? eur(c.revenueMonth) : "—"}</strong>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {c.price != null ? eur(c.price) : "Sem preço"}
                    {c.inPass ? " · No Passe" : ""} · {c.salesMonth} vendas no mês
                  </span>
                  {c.completionPct != null ? (
                    <>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Conclusão {c.completionPct}%</span>
                      <div style={{ height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ width: `${c.completionPct}%`, height: "100%", background: "var(--success)" }} />
                      </div>
                    </>
                  ) : null}
                </div>
              ))
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}
