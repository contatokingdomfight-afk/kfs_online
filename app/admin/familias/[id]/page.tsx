import { getSchoolScope, canAccessSchool } from "@/lib/school-scope";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getFamilyGroupDetail } from "@/lib/family-group";
import { computeFamilyGroupMonthlyTuition, listFamilyMemberPaidCredits, listFamilyReferencePlanOptions } from "@/lib/family-tuition";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
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
  if (!canAccessSchool(await getSchoolScope(), detail.group.schoolId)) notFound();

  const [breakdown, referencePlanOptions, credits] = await Promise.all([
    computeFamilyGroupMonthlyTuition(result.client, id),
    listFamilyReferencePlanOptions(result.client, detail.group.schoolId),
    listFamilyMemberPaidCredits(result.client, id, currentReferenceMonthLisbon(new Date())),
  ]);
  const nameById = new Map(detail.members.map((m) => [m.studentId, m.name]));
  const titularName = detail.members.find((m) => m.role === "TITULAR")?.name ?? "o titular";
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-PT", { month: "long", timeZone: "UTC" });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Link href="/admin/familias" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
        ← Planos família
      </Link>
      <h1 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 600 }}>
        {detail.group.name || "Grupo familiar"}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 14, lineHeight: 1.5 }}>
        Grupo familiar com desconto na mensalidade. Cada membro mantém o seu plano individual (acesso e
        quota de referência); a mensalidade combinada é paga pelo titular. Matrícula e seguro continuam
        individuais.
      </p>
      {credits.length > 0 ? (
        <div
          role="status"
          className="card"
          style={{ padding: 14, marginBottom: 16, fontSize: 14, lineHeight: 1.5, border: "1px solid color-mix(in srgb, var(--warning, #f59e0b) 45%, var(--border))" }}
        >
          {credits.map((c) => (
            <p key={`${c.studentId}-${c.referenceMonth}`} style={{ margin: "0 0 4px" }}>
              <strong>{nameById.get(c.studentId) ?? "Membro"}</strong> já pagou {c.amount.toFixed(2).replace(".", ",")} € de{" "}
              {monthLabel(c.referenceMonth)} — abatido na mensalidade de {titularName}.
            </p>
          ))}
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--text-secondary)" }}>
            A família não paga duas vezes o mesmo mês; não é preciso reembolsar.
          </p>
        </div>
      ) : null}
      <FamiliaDetailClient
        detail={detail}
        breakdown={"error" in breakdown ? null : breakdown}
        referencePlanOptions={referencePlanOptions}
      />
    </div>
  );
}
