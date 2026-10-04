import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { TestimonialModerationActions } from "./TestimonialModerationActions";

export const dynamic = "force-dynamic";

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden style={{ color: "var(--primary)", letterSpacing: 1 }}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

export default async function AdminCoachTestimonialsPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const admin = getAdminClientOrNull();
  if (!admin.client) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)" }}>
          Configura <code>SUPABASE_SERVICE_ROLE_KEY</code> para gerir depoimentos.
        </p>
      </div>
    );
  }
  const supabase = admin.client;

  const { data: testimonials } = await supabase
    .from("CoachTestimonial")
    .select("id, coachId, studentId, rating, body, status, createdAt")
    .order("status", { ascending: true })
    .order("createdAt", { ascending: false });

  const rows = testimonials ?? [];
  const coachIds = [...new Set(rows.map((r) => r.coachId as string))];
  const studentIds = [...new Set(rows.map((r) => r.studentId as string))];

  const [{ data: coaches }, { data: students }] = await Promise.all([
    coachIds.length > 0 ? supabase.from("Coach").select("id, userId").in("id", coachIds) : Promise.resolve({ data: [] }),
    studentIds.length > 0 ? supabase.from("Student").select("id, userId").in("id", studentIds) : Promise.resolve({ data: [] }),
  ]);

  const userIds = [...new Set([...(coaches ?? []).map((c) => c.userId as string), ...(students ?? []).map((s) => s.userId as string)])];
  const { data: users } = userIds.length > 0 ? await supabase.from("User").select("id, name").in("id", userIds) : { data: [] };
  const nameByUserId = new Map((users ?? []).map((u) => [u.id as string, u.name as string | null]));
  const coachUserById = new Map((coaches ?? []).map((c) => [c.id as string, c.userId as string]));
  const studentUserById = new Map((students ?? []).map((s) => [s.id as string, s.userId as string]));

  const coachName = (coachId: string) => nameByUserId.get(coachUserById.get(coachId) ?? "") || "—";
  const studentName = (studentId: string) => nameByUserId.get(studentUserById.get(studentId) ?? "") || "—";

  const pending = rows.filter((r) => r.status === "PENDING");
  const moderated = rows.filter((r) => r.status !== "PENDING");

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Link href="/admin/coaches" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}>
          ← Coaches
        </Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>Depoimentos de alunos</h1>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)" }}>
        Por aprovar ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>Nada pendente.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {pending.map((t) => (
            <li key={t.id} className="card" style={{ padding: 16 }}>
              <Stars rating={t.rating as number} />
              <p style={{ margin: "6px 0", fontSize: 14, color: "var(--text-primary)" }}>{t.body}</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                {studentName(t.studentId as string)} → {coachName(t.coachId as string)}
              </p>
              <TestimonialModerationActions testimonialId={t.id as string} />
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: "var(--text-primary)" }}>Histórico</h2>
      {moderated.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Ainda sem decisões.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {moderated.map((t) => (
            <li key={t.id} className="card" style={{ padding: 14, opacity: 0.8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.status === "APPROVED" ? "var(--success)" : "var(--danger)" }}>
                {t.status === "APPROVED" ? "Aprovado" : "Rejeitado"}
              </span>
              <p style={{ margin: "4px 0", fontSize: 14, color: "var(--text-primary)" }}>{t.body}</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                {studentName(t.studentId as string)} → {coachName(t.coachId as string)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
