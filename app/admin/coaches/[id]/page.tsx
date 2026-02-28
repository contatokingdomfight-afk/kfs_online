import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { EditarCoachForm } from "./EditarCoachForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCoachEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: coachId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: coach } = await supabase.from("Coach").select("id, userId, specialties").eq("id", coachId).single();

  if (!coach) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Coach não encontrado.</p>
        <Link href="/admin/coaches" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar à lista
        </Link>
      </div>
    );
  }

  const { data: user } = await supabase.from("User").select("id, name, email").eq("id", coach.userId).single();

  return (
    <div style={{ maxWidth: "min(420px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/coaches"
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
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Editar coach
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {user?.email}
      </p>
      <EditarCoachForm
        coachId={coachId}
        initialName={user?.name ?? ""}
        initialSpecialties={coach.specialties ?? ""}
      />
    </div>
  );
}
