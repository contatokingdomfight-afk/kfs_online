import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";

type SearchParams = Promise<{ month?: string }>;

function getMonthRange(yearMonth: string): { start: string; end: string; label: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const label = start.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CoachFinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const params = await searchParams;
  const selectedMonth = params.month ?? currentYearMonth();
  const { start, end, label } = getMonthRange(selectedMonth);

  // Buscar dados do coach
  const { data: coach } = await supabase
    .from("Coach")
    .select("id, studentId, hourly_rate, specialties")
    .eq("userId", dbUser.id)
    .single();

  if (!coach) {
    return (
      <div style={{ maxWidth: "min(600px, 100%)" }}>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Financeiro
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>Perfil de coach não encontrado.</p>
      </div>
    );
  }

  const hourlyRate = Number(coach.hourly_rate ?? 0);

  // Buscar aulas do mês lecionadas por este coach
  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, date, modality, startTime, endTime")
    .eq("coachId", coach.id)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  const lessonCount = (lessons ?? []).length;
  const lessonPay = lessonCount * hourlyRate;

  // Buscar receita de cursos no mês (via CourseCreator)
  let courseSales: { courseName: string; amount: number; earned: number; pct: number; date: string }[] = [];
  let totalCoursePay = 0;

  if (coach.studentId) {
    const { data: ccEntries } = await supabase
      .from("CourseCreator")
      .select("course_id, revenue_pct")
      .eq("student_id", coach.studentId);

    const myCourseIds = (ccEntries ?? []).map((cc) => cc.course_id);

    if (myCourseIds.length > 0) {
      const [{ data: purchases }, { data: courses }] = await Promise.all([
        supabase
          .from("CoursePurchase")
          .select("id, courseId, amount, createdAt")
          .in("courseId", myCourseIds)
          .gte("createdAt", `${start}T00:00:00`)
          .lte("createdAt", `${end}T23:59:59`)
          .order("createdAt", { ascending: true }),
        supabase.from("Course").select("id, name").in("id", myCourseIds),
      ]);

      const courseNameById = new Map((courses ?? []).map((c) => [c.id, c.name]));
      const pctByCourseId = new Map((ccEntries ?? []).map((cc) => [cc.course_id, cc.revenue_pct]));

      for (const p of purchases ?? []) {
        const pct = pctByCourseId.get(p.courseId) ?? 0;
        const amount = Number(p.amount ?? 0);
        const earned = (amount * pct) / 100;
        totalCoursePay += earned;
        courseSales.push({
          courseName: courseNameById.get(p.courseId) ?? p.courseId,
          amount,
          earned,
          pct,
          date: p.createdAt,
        });
      }
    }
  }

  const totalMonth = lessonPay + totalCoursePay;

  // Meses disponíveis (últimos 12)
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function formatDate(d: string | null | undefined): string {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return String(d);
    }
  }

  return (
    <div style={{ maxWidth: "min(620px, 100%)" }}>
      <h1 style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Meu Financeiro
      </h1>

      {/* Seletor de mês */}
      <div style={{ marginBottom: "clamp(16px, 4vw, 20px)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Mês:</span>
        {monthOptions.map((m) => {
          const [y, mo] = m.split("-").map(Number);
          const d = new Date(y, mo - 1, 1);
          const lbl = d.toLocaleDateString("pt-PT", { month: "short", year: "numeric" });
          return (
            <Link
              key={m}
              href={`/coach/financeiro?month=${m}`}
              className="btn"
              style={{
                textDecoration: "none",
                fontSize: 13,
                padding: "4px 10px",
                backgroundColor: m === selectedMonth ? "var(--primary)" : "var(--bg-secondary)",
                color: m === selectedMonth ? "#fff" : "var(--text-primary)",
              }}
            >
              {lbl}
            </Link>
          );
        })}
      </div>

      {/* Resumo do mês */}
      <div
        style={{
          padding: "clamp(16px, 4vw, 20px)",
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          borderLeft: "3px solid var(--primary)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <p style={{ margin: "0 0 4px 0", fontSize: 14, color: "var(--text-secondary)" }}>{label}</p>
        <p style={{ margin: 0, fontSize: "clamp(26px, 6.5vw, 32px)", fontWeight: 700, color: "var(--primary)" }}>
          €{totalMonth.toFixed(2)}
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>estimativa total do mês</p>
      </div>

      {/* Cards de detalhe */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "clamp(10px, 2.5vw, 14px)",
          marginBottom: "clamp(24px, 6vw, 32px)",
        }}
      >
        <div className="card" style={{ padding: "clamp(14px, 3.5vw, 16px)" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Aulas lecionadas</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: "clamp(20px, 5vw, 24px)", color: "var(--text-primary)" }}>
            {lessonCount}
          </p>
        </div>
        <div className="card" style={{ padding: "clamp(14px, 3.5vw, 16px)" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Valor/hora</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: "clamp(18px, 4.5vw, 22px)", color: "var(--text-primary)" }}>
            {hourlyRate > 0 ? `€${hourlyRate.toFixed(2)}` : <span style={{ fontWeight: 400, fontSize: 14, color: "var(--text-secondary)" }}>—</span>}
          </p>
        </div>
        <div className="card" style={{ padding: "clamp(14px, 3.5vw, 16px)" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Pagamento aulas</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: "clamp(18px, 4.5vw, 22px)", color: "var(--text-primary)" }}>
            €{lessonPay.toFixed(2)}
          </p>
        </div>
        <div className="card" style={{ padding: "clamp(14px, 3.5vw, 16px)" }}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Receita cursos</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: "clamp(18px, 4.5vw, 22px)", color: totalCoursePay > 0 ? "var(--success)" : "var(--text-primary)" }}>
            €{totalCoursePay.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Lista de aulas */}
      {(lessons ?? []).length > 0 && (
        <section style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Aulas de {label}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {(lessons ?? []).map((l) => (
              <li
                key={l.id}
                style={{
                  padding: "10px 14px",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                    {l.modality}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 8 }}>
                    {l.startTime} – {l.endTime}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {formatDate(l.date)}
                  </span>
                  {hourlyRate > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>
                      €{hourlyRate.toFixed(2)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Vendas de cursos */}
      {courseSales.length > 0 && (
        <section style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Vendas de cursos em {label}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {courseSales.map((s, i) => (
              <li
                key={i}
                style={{
                  padding: "10px 14px",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                    {s.courseName}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>
                    preço: €{s.amount.toFixed(0)} · tua parte: {s.pct}%
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {formatDate(s.date)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>
                    +€{s.earned.toFixed(2)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lessonCount === 0 && courseSales.length === 0 && (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
            Sem aulas nem vendas de cursos registadas em {label}.
          </p>
        </div>
      )}

      {hourlyRate === 0 && (
        <div
          style={{
            marginTop: "clamp(16px, 4vw, 20px)",
            padding: "clamp(12px, 3vw, 14px)",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            borderLeft: "3px solid var(--warning, var(--primary))",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
            O teu valor por hora ainda não está definido. Fala com o admin para configurar o teu pagamento por aula.
          </p>
        </div>
      )}
    </div>
  );
}
