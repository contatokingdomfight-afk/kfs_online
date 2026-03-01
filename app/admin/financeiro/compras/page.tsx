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
    courseIds.length > 0 ? supabase.from("Course").select("id, name").in("id", courseIds) : Promise.resolve({ data: [] }),
    eventIds.length > 0 ? supabase.from("Event").select("id, name, event_date").in("id", eventIds) : Promise.resolve({ data: [] }),
  ]);

  const students = studentsRes.data ?? [];
  const userIds = [...new Set(students.map((s) => s.userId))];
  const { data: users } = userIds.length > 0 ? await supabase.from("User").select("id, name, email").in("id", userIds) : { data: [] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map(students.map((s) => [s.id, userById.get(s.userId)]));
  const courseById = new Map((coursesRes.data ?? []).map((c) => [c.id, c]));
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
                      €{Number(p.amount ?? 0).toFixed(0)}
                    </span>
                  </div>
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
