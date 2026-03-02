import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

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

export default async function AdminFinanceiroCoachesPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const selectedMonth = params.month ?? currentYearMonth();
  const { start, end, label } = getMonthRange(selectedMonth);

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  // Buscar todos os coaches com hourly_rate
  const { data: coaches } = await supabase
    .from("Coach")
    .select("id, userId, specialties, studentId, hourly_rate")
    .order("createdAt", { ascending: true });

  if (!coaches || coaches.length === 0) {
    return (
      <div style={{ maxWidth: "min(700px, 100%)" }}>
        <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
          <Link href="/admin/financeiro" style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}>
            ← Voltar
          </Link>
        </div>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Pagamentos a Coaches
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>Nenhum coach registado.</p>
      </div>
    );
  }

  const coachIds = coaches.map((c) => c.id);
  const coachUserIds = coaches.map((c) => c.userId);
  const coachStudentIds = coaches.filter((c) => c.studentId).map((c) => c.studentId as string);

  // Buscar aulas do mês para todos os coaches
  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, coachId, date")
    .in("coachId", coachIds)
    .gte("date", start)
    .lte("date", end);

  // Agrupar aulas por coach
  const lessonsByCoach = new Map<string, number>();
  for (const lesson of lessons ?? []) {
    lessonsByCoach.set(lesson.coachId, (lessonsByCoach.get(lesson.coachId) ?? 0) + 1);
  }

  // Buscar compras de cursos no mês (via CourseCreator)
  const { data: coursePurchases } = await supabase
    .from("CoursePurchase")
    .select("id, courseId, amount, status, createdAt")
    .gte("createdAt", `${start}T00:00:00`)
    .lte("createdAt", `${end}T23:59:59`);

  const purchasedCourseIds = [...new Set((coursePurchases ?? []).map((p) => p.courseId))];

  let courseCreators: { course_id: string; student_id: string; revenue_pct: number }[] = [];
  if (purchasedCourseIds.length > 0) {
    const { data: ccs } = await supabase
      .from("CourseCreator")
      .select("course_id, student_id, revenue_pct")
      .in("course_id", purchasedCourseIds)
      .in("student_id", coachStudentIds.length > 0 ? coachStudentIds : ["__none__"]);
    courseCreators = ccs ?? [];
  }

  // Calcular receita de cursos por student_id do coach
  const courseRevenueByStudentId = new Map<string, number>();
  for (const cc of courseCreators) {
    for (const purchase of (coursePurchases ?? []).filter((p) => p.courseId === cc.course_id)) {
      const amount = Number(purchase.amount ?? 0);
      const earned = (amount * cc.revenue_pct) / 100;
      courseRevenueByStudentId.set(cc.student_id, (courseRevenueByStudentId.get(cc.student_id) ?? 0) + earned);
    }
  }

  // Buscar nomes dos coaches
  const { data: coachUsers } = await supabase.from("User").select("id, name, email").in("id", coachUserIds);
  const userById = new Map((coachUsers ?? []).map((u) => [u.id, u]));

  // Meses disponíveis para navegar (últimos 12)
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const grandTotal = coaches.reduce((sum, coach) => {
    const user = userById.get(coach.userId);
    if (!user) return sum;
    const lessonCount = lessonsByCoach.get(coach.id) ?? 0;
    const hourlyRate = Number(coach.hourly_rate ?? 0);
    const lessonPay = lessonCount * hourlyRate;
    const coursePay = coach.studentId ? (courseRevenueByStudentId.get(coach.studentId) ?? 0) : 0;
    return sum + lessonPay + coursePay;
  }, 0);

  return (
    <div style={{ maxWidth: "min(750px, 100%)" }}>
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
          href="/admin/financeiro"
          style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Pagamentos a Coaches
        </h1>
      </div>

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
              href={`/admin/financeiro/coaches?month=${m}`}
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

      {/* Cabeçalho do mês */}
      <div
        style={{
          padding: "clamp(14px, 3.5vw, 16px)",
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          borderLeft: "3px solid var(--primary)",
          marginBottom: "clamp(16px, 4vw, 20px)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {label}
        </span>
        <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--primary)" }}>
          Total a pagar: €{grandTotal.toFixed(2)}
        </span>
      </div>

      {/* Lista de coaches */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
        {coaches.map((coach) => {
          const user = userById.get(coach.userId);
          if (!user) return null;

          const lessonCount = lessonsByCoach.get(coach.id) ?? 0;
          const hourlyRate = Number(coach.hourly_rate ?? 0);
          const lessonPay = lessonCount * hourlyRate;
          const coursePay = coach.studentId ? (courseRevenueByStudentId.get(coach.studentId) ?? 0) : 0;
          const total = lessonPay + coursePay;

          return (
            <li key={coach.id} className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)" }}>
                    {user.name || user.email}
                  </p>
                  {coach.specialties && (
                    <p style={{ margin: "2px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{coach.specialties}</p>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 700, color: "var(--primary)" }}>
                    €{total.toFixed(2)}
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>total a pagar</p>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Aulas lecionadas</p>
                  <p style={{ margin: "2px 0 0 0", fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
                    {lessonCount}
                  </p>
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
                    Valor/hora
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
                    {hourlyRate > 0 ? `€${hourlyRate.toFixed(2)}` : <span style={{ color: "var(--text-secondary)", fontWeight: 400, fontSize: 13 }}>não definido</span>}
                  </p>
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Pagamento aulas</p>
                  <p style={{ margin: "2px 0 0 0", fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
                    €{lessonPay.toFixed(2)}
                  </p>
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Receita cursos</p>
                  <p style={{ margin: "2px 0 0 0", fontWeight: 600, fontSize: "clamp(14px, 3.5vw, 16px)", color: coursePay > 0 ? "var(--success)" : "var(--text-primary)" }}>
                    €{coursePay.toFixed(2)}
                  </p>
                </div>
              </div>

              {hourlyRate === 0 && lessonCount > 0 && (
                <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "var(--warning, var(--primary))", fontStyle: "italic" }}>
                  ⚠ Define o valor/hora neste coach para calcular automaticamente o pagamento por aulas.
                </p>
              )}

              <div style={{ marginTop: 10 }}>
                <Link
                  href={`/admin/coaches/${coach.id}`}
                  style={{ fontSize: 13, color: "var(--primary)", textDecoration: "underline" }}
                >
                  Editar coach →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
