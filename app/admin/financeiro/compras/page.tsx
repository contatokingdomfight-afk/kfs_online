import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
};

export default async function ComprasInscricoesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [purchasesRes, registrationsRes] = await Promise.all([
    supabase
      .from("CoursePurchase")
      .select("id, studentId, courseId, amount, status, createdAt")
      .order("createdAt", { ascending: false })
      .limit(100),
    supabase
      .from("EventRegistration")
      .select("id, studentId, eventId, status, registered_at")
      .order("registered_at", { ascending: false })
      .limit(100),
  ]);

  const purchases = purchasesRes.data ?? [];
  const registrations = registrationsRes.data ?? [];

  const studentIds = [...new Set([...purchases.map((p) => p.studentId), ...registrations.map((r) => r.studentId)])];
  const courseIds = [...new Set(purchases.map((p) => p.courseId))];
  const eventIds = [...new Set(registrations.map((r) => r.eventId))];

  const [studentsRes, coursesRes, eventsRes] = await Promise.all([
    studentIds.length > 0 ? supabase.from("Student").select("id, userId").in("id", studentIds) : Promise.resolve({ data: [] }),
    courseIds.length > 0 ? supabase.from("Course").select("id, name, price, coach_revenue_pct, creator_student_id").in("id", courseIds) : Promise.resolve({ data: [] }),
    eventIds.length > 0 ? supabase.from("Event").select("id, name, event_date").in("id", eventIds) : Promise.resolve({ data: [] }),
  ]);

  const students = studentsRes.data ?? [];
  const userIds = [...new Set(students.map((s) => s.userId))];
  const { data: users } = userIds.length > 0 ? await supabase.from("User").select("id, name, email").in("id", userIds) : { data: [] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map(students.map((s) => [s.id, userById.get(s.userId)]));
  const courseById = new Map((coursesRes.data ?? []).map((c: { id: string; name: string; price?: number | null; coach_revenue_pct?: number | null; creator_student_id?: string | null }) => [c.id, c]));

  // Buscar nomes dos coaches criadores dos cursos
  const creatorIds = [...new Set((coursesRes.data ?? []).filter((c: { creator_student_id?: string | null }) => c.creator_student_id).map((c: { creator_student_id?: string | null }) => c.creator_student_id as string))];
  let creatorNameById = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase.from("Student").select("id, userId").in("id", creatorIds);
    const creatorUserIds = (creators ?? []).map((s: { id: string; userId: string }) => s.userId);
    if (creatorUserIds.length > 0) {
      const { data: creatorUsers } = await supabase.from("User").select("id, name").in("id", creatorUserIds);
      const userNameById = new Map((creatorUsers ?? []).map((u: { id: string; name: string | null }) => [u.id, u.name ?? "—"]));
      (creators ?? []).forEach((s: { id: string; userId: string }) => {
        creatorNameById.set(s.id, userNameById.get(s.userId) ?? "—");
      });
    }
  }
  const eventById = new Map((eventsRes.data ?? []).map((e) => [e.id, e]));

  function formatDate(d: string | null | undefined): string {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return String(d);
    }
  }

  return (
    <div style={{ maxWidth: "min(800px, 100%)" }}>
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
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Compras e inscrições
        </h1>
      </div>

      <p style={{ margin: "0 0 20px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Compras de cursos avulsos e inscrições em eventos. O pagamento é acertado na escola.
      </p>

      {purchases.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Compras de cursos
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {purchases.map((p) => {
              const u = studentToUser.get(p.studentId);
              const course = courseById.get(p.courseId);
              const amount = Number(p.amount ?? course?.price ?? 0);
              const coachPct = course?.coach_revenue_pct ?? 0;
              const isCoachCourse = !!course?.creator_student_id;
              const coachEarns = isCoachCourse ? (amount * coachPct) / 100 : 0;
              const kfsEarns = isCoachCourse ? amount - coachEarns : amount;
              const coachName = course?.creator_student_id ? creatorNameById.get(course.creator_student_id) : null;
              return (
                <li key={p.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {u?.name || u?.email || "—"}
                    </span>
                    <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      {course?.name ?? p.courseId}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--primary)" }}>
                      €{amount.toFixed(0)}
                    </span>
                  </div>
                  {isCoachCourse && (
                    <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, padding: "2px 8px", borderRadius: "var(--radius-md)", background: "var(--surface)", color: "var(--text-secondary)" }}>
                        Coach {coachName ? `(${coachName})` : ""}: <strong style={{ color: "var(--primary)" }}>€{coachEarns.toFixed(2)}</strong> ({coachPct}%)
                      </span>
                      <span style={{ fontSize: 13, padding: "2px 8px", borderRadius: "var(--radius-md)", background: "var(--surface)", color: "var(--text-secondary)" }}>
                        KFS: <strong>€{kfsEarns.toFixed(2)}</strong> ({100 - coachPct}%)
                      </span>
                    </div>
                  )}
                  <p style={{ margin: "4px 0 0 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                    {formatDate(p.createdAt)} · {STATUS_LABEL[p.status] ?? p.status}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {registrations.length > 0 && (
        <section>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Inscrições em eventos
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {registrations.map((r) => {
              const u = studentToUser.get(r.studentId);
              const event = eventById.get(r.eventId);
              return (
                <li key={r.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {u?.name || u?.email || "—"}
                    </span>
                    <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      {event?.name ?? r.eventId}
                    </span>
                    {event?.event_date && (
                      <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                        {formatDate(event.event_date)}
                      </span>
                    )}
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: r.status === "CONFIRMED" ? "var(--success)" : "var(--surface)",
                        color: r.status === "CONFIRMED" ? "#fff" : "var(--text-secondary)",
                      }}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                    Inscrito em {formatDate(r.registered_at)}
                  </p>
                  <Link
                    href={`/admin/eventos/${r.eventId}`}
                    style={{ marginTop: 8, display: "inline-block", fontSize: 14, color: "var(--primary)", textDecoration: "underline" }}
                  >
                    Ver evento →
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {purchases.length === 0 && registrations.length === 0 && (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
            Ainda não há compras de cursos nem inscrições em eventos.
          </p>
        </div>
      )}
    </div>
  );
}
