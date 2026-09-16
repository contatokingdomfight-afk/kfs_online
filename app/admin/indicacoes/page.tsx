import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { REFERRAL_XP_REWARD } from "@/lib/referral-rewards";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatEuro(n: number): string {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";
}

export default async function AdminIndicacoesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: credits } = await supabase
    .from("ReferralCredit")
    .select("id, studentId, amount, reason, referredStudentId, consumedAt, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = credits ?? [];

  const studentIds = [...new Set(rows.flatMap((r) => [r.studentId, r.referredStudentId].filter(Boolean)))] as string[];
  const { data: students } = studentIds.length
    ? await supabase.from("Student").select("id, userId").in("id", studentIds)
    : { data: [] };
  const userIdByStudentId = new Map((students ?? []).map((s) => [s.id, s.userId as string]));
  const userIds = [...new Set([...userIdByStudentId.values()])];
  const { data: users } = userIds.length ? await supabase.from("User").select("id, name, email").in("id", userIds) : { data: [] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  const nameForStudent = (studentId: string | null): string => {
    if (!studentId) return "—";
    const userId = userIdByStudentId.get(studentId);
    const user = userId ? userById.get(userId) : null;
    return user?.name?.trim() || user?.email || "—";
  };

  const totalGenerated = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalConsumed = rows.filter((r) => r.consumedAt).reduce((sum, r) => sum + Number(r.amount), 0);
  const totalPending = totalGenerated - totalConsumed;
  const referralsCount = rows.length;

  return (
    <div style={{ maxWidth: "min(720px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin"
          style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Indicações de amigos
      </h1>
      <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Cada indicação convertida em aluno pagante dá {REFERRAL_XP_REWARD} XP ao indicador e, só para quem paga
        presencial, um crédito na mensalidade seguinte.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>Indicações convertidas</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{referralsCount}</p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>Crédito gerado</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{formatEuro(totalGenerated)}</p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>Já consumido</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{formatEuro(totalConsumed)}</p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>Por consumir</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>{formatEuro(totalPending)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Ainda não houve nenhuma indicação convertida em aluno.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {rows.map((r) => (
            <li key={r.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {nameForStudent(r.studentId)}
                </span>
                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                  indicou {nameForStudent(r.referredStudentId)}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: r.consumedAt ? "var(--bg)" : "#7c2d12",
                    color: r.consumedAt ? "var(--text-secondary)" : "#fff",
                  }}
                >
                  {r.consumedAt ? `Consumido em ${formatDate(r.consumedAt)}` : "Por consumir"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                {formatEuro(Number(r.amount))} · gerado em {formatDate(r.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
