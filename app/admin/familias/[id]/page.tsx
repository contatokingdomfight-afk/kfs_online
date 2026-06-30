import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getFamilyGroupDetail } from "@/lib/family-group";
import { FamiliaDetailClient } from "./FamiliaDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function AdminFamiliaDetailPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;

  const detail = await getFamilyGroupDetail(result.client, id);
  if (!detail) notFound();

  return (
    <div style={{ maxWidth: 560 }}>
      <Link href="/admin/familias" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
        ← Planos família
      </Link>
      <h1 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 600 }}>
        {detail.group.name || "Grupo familiar"}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 14 }}>
        Mensalidade única no titular · acesso equivalente ao Kingdom Presencial MMA
      </p>
      <FamiliaDetailClient detail={detail} />
    </div>
  );
}
