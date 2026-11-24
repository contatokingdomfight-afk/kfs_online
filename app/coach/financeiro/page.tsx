import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { groupLinesByPlan } from "@/lib/coach-revenue";
import { loadCoachMonthReport, monthRange } from "@/lib/coach-revenue.server";

type SearchParams = Promise<{ month?: string; tab?: string }>;

const eur = (n: number) => `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string, style: "long" | "short" = "long"): string {
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-PT", { month: style, year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
}

const statStyle: React.CSSProperties = { padding: "10px 12px" };
const statLabel: React.CSSProperties = { margin: 0, fontSize: 12, color: "var(--text-secondary)" };
const statValue: React.CSSProperties = { margin: "2px 0 0", fontWeight: 700, fontSize: "clamp(18px, 4.5vw, 22px)" };

export default async function CoachFinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const params = await searchParams;
  const selectedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : currentYearMonth();
  const tab = params.tab === "alunos" ? "alunos" : "resumo";
  const label = monthLabel(selectedMonth);

  const { data: coach } = await supabase.from("Coach").select("id, studentId").eq("userId", dbUser.id).maybeSingle();
  if (!coach) {
    return (
      <div style={{ maxWidth: "min(600px, 100%)" }}>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Meu financeiro</h1>
        <p style={{ color: "var(--text-secondary)" }}>Perfil de coach não encontrado.</p>
      </div>
    );
  }

  const [report, { data: payouts }] = await Promise.all([
    loadCoachMonthReport(supabase, coach.id as string, selectedMonth),
    supabase.from("CoachPayout").select("schoolId, amount, status, paidAt").eq("coachId", coach.id).eq("referenceMonth", selectedMonth),
  ]);
  const paidPayouts = (payouts ?? []).filter((p) => p.status === "PAID");
  const payoutNote =
    paidPayouts.length > 0
      ? `Pago a ${shortDate(paidPayouts[0].paidAt as string)}${paidPayouts.length < report.schools.length ? " (em parte)" : ""}.`
      : "Por pagar · o Diretor Técnico marca o pagamento até dia 10 do mês seguinte, contra recibo verde.";

  // Receita de cursos online (co-criação) — continua igual.
  let totalCoursePay = 0;
  const courseSales: { courseName: string; earned: number; pct: number; date: string }[] = [];
  if (coach.studentId) {
    const { data: ccEntries } = await supabase.from("CourseCreator").select("course_id, revenue_pct").eq("student_id", coach.studentId);
    const myCourseIds = (ccEntries ?? []).map((cc) => cc.course_id);
    if (myCourseIds.length > 0) {
      const { start, end } = monthRange(selectedMonth);
      const [{ data: purchases }, { data: courses }] = await Promise.all([
        supabase.from("CoursePurchase").select("courseId, amount, createdAt").in("courseId", myCourseIds).gte("createdAt", start).lt("createdAt", end),
        supabase.from("Course").select("id, name").in("id", myCourseIds),
      ]);
      const courseName = new Map((courses ?? []).map((c) => [c.id, c.name]));
      const pctById = new Map((ccEntries ?? []).map((cc) => [cc.course_id, cc.revenue_pct]));
      for (const p of purchases ?? []) {
        const pct = Number(pctById.get(p.courseId) ?? 0);
        const earned = (Number(p.amount ?? 0) * pct) / 100;
        totalCoursePay += earned;
        courseSales.push({ courseName: courseName.get(p.courseId) ?? p.courseId, earned, pct, date: p.createdAt });
      }
    }
  }

  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const byPlan = groupLinesByPlan(report.lines);
  const paidShare = report.forecast > 0 ? Math.round((report.received / report.forecast) * 100) : 0;
  const tabHref = (t: string) => `/coach/financeiro?month=${selectedMonth}${t === "alunos" ? "&tab=alunos" : ""}`;

  return (
    <div style={{ maxWidth: "min(860px, 100%)" }}>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Meu financeiro</h1>

      <div style={{ marginBottom: 16, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {monthOptions.map((m) => (
          <Link
            key={m}
            href={`/coach/financeiro?month=${m}${tab === "alunos" ? "&tab=alunos" : ""}`}
            className="btn"
            style={{
              textDecoration: "none",
              fontSize: 13,
              padding: "4px 10px",
              whiteSpace: "nowrap",
              backgroundColor: m === selectedMonth ? "var(--primary)" : "var(--bg-secondary)",
              color: m === selectedMonth ? "#fff" : "var(--text-primary)",
            }}
          >
            {monthLabel(m, "short")}
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", borderLeft: "3px solid var(--success, #34d399)" }}>
          <p style={statLabel}>A tua parte já garantida · {label}</p>
          <p style={{ margin: "2px 0 0", fontSize: "clamp(26px, 6.5vw, 32px)", fontWeight: 800, color: "var(--success, #34d399)" }}>
            {eur(report.received)}
          </p>
          <div style={{ height: 8, borderRadius: 999, background: "var(--bg-secondary)", overflow: "hidden", display: "flex", margin: "10px 0 6px" }}>
            <span style={{ width: `${paidShare}%`, background: "var(--success, #34d399)" }} />
            <span style={{ width: `${100 - paidShare}%`, background: "var(--warning, #fbbf24)" }} />
          </div>
          <p style={{ ...statLabel, fontSize: 12.5 }}>{payoutNote}</p>
        </div>
        <div className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
          <p style={statLabel}>Previsão se todos pagarem</p>
          <p style={{ margin: "2px 0 0", fontSize: "clamp(26px, 6.5vw, 32px)", fontWeight: 800 }}>{eur(report.forecast)}</p>
          <p style={{ ...statLabel, fontSize: 12.5 }}>
            <span style={{ color: "var(--warning, #fbbf24)" }}>+{eur(report.pending)}</span> ainda por receber de {report.pendingStudentCount}{" "}
            {report.pendingStudentCount === 1 ? "aluno" : "alunos"}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
        <div className="card" style={statStyle}>
          <p style={statLabel}>Os teus alunos</p>
          <p style={statValue}>{report.studentCount}</p>
        </div>
        <div className="card" style={statStyle}>
          <p style={statLabel}>Já pagaram</p>
          <p style={{ ...statValue, color: "var(--success, #34d399)" }}>{report.paidStudentCount}</p>
        </div>
        <div className="card" style={statStyle}>
          <p style={statLabel}>Em atraso</p>
          <p style={{ ...statValue, color: "var(--warning, #fbbf24)" }}>{report.pendingStudentCount}</p>
        </div>
        <div className="card" style={statStyle}>
          <p style={statLabel}>Cursos online</p>
          <p style={statValue}>{eur(totalCoursePay)}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 14 }}>
        {[
          ["resumo", "Resumo"],
          ["alunos", `Alunos (${report.studentCount})`],
        ].map(([key, text]) => (
          <Link
            key={key}
            href={tabHref(key)}
            style={{
              padding: "8px 12px",
              fontSize: 14,
              textDecoration: "none",
              color: tab === key ? "var(--text-primary)" : "var(--text-secondary)",
              borderBottom: `2px solid ${tab === key ? "var(--primary)" : "transparent"}`,
            }}
          >
            {text}
          </Link>
        ))}
      </div>

      {tab === "resumo" ? (
        <>
          <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", marginBottom: 14 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600 }}>Por plano</h2>
            {byPlan.length === 0 ? (
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>Sem mensalidades dos teus alunos em {label}.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {byPlan.map((g) => (
                  <li
                    key={`${g.planName}|${g.rule}`}
                    style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, padding: "9px 0", borderTop: "1px solid var(--border)" }}
                  >
                    <span style={{ flex: "1 1 220px" }}>
                      <strong style={{ fontWeight: 600 }}>{g.planName}</strong>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--text-secondary)" }}>
                        {g.studentCount} {g.studentCount === 1 ? "aluno" : "alunos"} · {g.rule}
                      </span>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <strong style={{ color: "var(--success, #34d399)" }}>{eur(g.received)}</strong>
                      {g.pending > 0 && (
                        <span style={{ display: "block", fontSize: 12.5, color: "var(--warning, #fbbf24)" }}>+{eur(g.pending)} por receber</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {report.schools.length > 1 && (
            <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", marginBottom: 14 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600 }}>Por escola</h2>
              {report.schools.map((s) => (
                <div key={s.schoolId} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", fontSize: 14 }}>
                  <span>{s.schoolName}</span>
                  <span>
                    {eur(s.received)} <span style={{ color: "var(--text-secondary)" }}>(+{eur(s.pending)})</span>
                  </span>
                </div>
              ))}
            </section>
          )}

          <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", marginBottom: 14 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Como é calculado</h2>
            <div style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12.5, lineHeight: 1.7, background: "var(--bg-secondary)", borderRadius: 8, padding: "10px 12px" }}>
              Preço de tabela ÷ 1,23 = valor sem IVA
              <br />1 modalidade → 40% · 2 modalidades → 35% por cada uma que dás
              <br />todas as modalidades → 80% ÷ professores da escola
              <br />Kingdom Week → 10,00 € fixos
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}>
              Conta só quem pagou neste mês, sempre pelo preço de tabela: fidelização, pack família e cupões são descontos da escola e
              não reduzem a tua parte. Bolsa de 100%: ninguém recebe.
            </p>
          </section>

          {courseSales.length > 0 && (
            <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600 }}>Vendas de cursos em {label}</h2>
              {courseSales.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", fontSize: 14 }}>
                  <span>
                    {s.courseName} <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>· tua parte {s.pct}%</span>
                  </span>
                  <span style={{ color: "var(--success, #34d399)", fontWeight: 600 }}>+{eur(s.earned)}</span>
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <section className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
          {report.lines.length === 0 ? (
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>Sem alunos com mensalidade em {label}.</p>
          ) : (
            report.lines.map((l) => (
              <div
                key={`${l.key}-${l.rule}`}
                style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderTop: "1px solid var(--border)", alignItems: "center" }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontWeight: 600 }}>{l.studentName}</strong>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {l.planName} · {l.rule}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: l.paid ? "color-mix(in srgb, var(--success, #34d399) 15%, transparent)" : "color-mix(in srgb, var(--warning, #fbbf24) 15%, transparent)",
                      color: l.paid ? "var(--success, #34d399)" : "var(--warning, #fbbf24)",
                    }}
                  >
                    {l.paid ? `Pago ${shortDate(l.paidAt)}` : "Em atraso"}
                  </span>
                  <div style={{ fontSize: 12.5, color: l.paid ? "var(--success, #34d399)" : "var(--warning, #fbbf24)" }}>
                    {l.paid ? `+${eur(l.amount)}` : `${eur(l.amount)} previsto`}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
