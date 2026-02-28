import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { EventForm } from "../EventForm";
import { DeleteEventoButton } from "./DeleteEventoButton";
import { ConfirmRegistrationButton } from "./ConfirmRegistrationButton";

const TYPE_LABELS: Record<string, string> = { CAMP: "Camp", WORKSHOP: "Workshop" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminEventosEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: eventId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: event } = await supabase
    .from("Event")
    .select("id, name, description, type, event_date, price, max_participants, is_active")
    .eq("id", eventId)
    .single();

  if (!event) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Evento não encontrado.</p>
        <Link href="/admin/eventos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  const { data: regs } = await supabase
    .from("EventRegistration")
    .select("id, studentId, status, registered_at")
    .eq("eventId", eventId)
    .order("registered_at", { ascending: false });

  const studentIds = [...new Set((regs ?? []).map((r) => r.studentId))];
  let students: { id: string; name: string | null; email: string }[] = [];
  if (studentIds.length > 0) {
    const { data: studentsData } = await supabase
      .from("Student")
      .select("id, userId")
      .in("id", studentIds);
    const userIds = (studentsData ?? []).map((s) => s.userId);
    const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
    const userMap = new Map((users ?? []).map((u) => [u.id, u]));
    students = (studentsData ?? []).map((s) => {
      const u = userMap.get(s.userId);
      return { id: s.id, name: u?.name ?? null, email: u?.email ?? "" };
    });
  }
  const studentMap = new Map(students.map((s) => [s.id, s]));

  return (
    <div style={{ maxWidth: "min(520px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/eventos"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Editar evento
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {event.name} · {TYPE_LABELS[event.type]} · €{Number(event.price).toFixed(0)}
      </p>
      <EventForm
        eventId={event.id}
        initialName={event.name}
        initialDescription={event.description ?? ""}
        initialType={event.type}
        initialEventDate={event.event_date}
        initialPrice={Number(event.price)}
        initialMaxParticipants={event.max_participants}
        initialIsActive={event.is_active ?? true}
      />
      <div style={{ marginTop: "clamp(32px, 8vw, 40px)" }}>
        <h2 style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
          Inscrições ({regs?.length ?? 0})
        </h2>
        {!regs || regs.length === 0 ? (
          <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>Nenhuma inscrição.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {regs.map((r) => {
              const s = studentMap.get(r.studentId);
              return (
                <li
                  key={r.id}
                  className="card"
                  style={{
                    padding: "clamp(12px, 3vw, 16px)",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)" }}>
                    {s?.name || s?.email || r.studentId}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-md)",
                      background: r.status === "CONFIRMED" ? "var(--success)" : "var(--surface)",
                      color: r.status === "CONFIRMED" ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {r.status === "CONFIRMED" ? "Confirmado" : "Pendente"}
                  </span>
                  {r.status === "PENDING" && (
                    <ConfirmRegistrationButton registrationId={r.id} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <DeleteEventoButton eventId={event.id} eventName={event.name} />
    </div>
  );
}
