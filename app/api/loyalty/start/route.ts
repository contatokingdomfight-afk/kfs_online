import { NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { resolveAutoPayPayer } from "@/lib/autopay/service";
import { startLoyalty } from "@/lib/loyalty/service";
import { refreshFamilyTitularPendingTuition } from "@/lib/family-tuition";

/** Aluno (ou titular do grupo) aceita a fidelização de 6 meses; o desconto começa na próxima mensalidade. */
export async function POST() {
  const [user, studentId] = await Promise.all([getCurrentDbUserUncached(), getCurrentStudentId()]);
  if (!user || !studentId) return NextResponse.json({ error: "Entra na tua conta para continuar." }, { status: 401 });
  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });

  const payer = await resolveAutoPayPayer(admin, studentId);
  if (payer.isFamilyMember) return NextResponse.json({ error: "A fidelização do grupo familiar é feita pelo titular." }, { status: 403 });
  const res = await startLoyalty(admin, { payerStudentId: payer.payerStudentId, familyGroupId: payer.familyGroupId, createdByUserId: user.id });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
  if (payer.familyGroupId) await refreshFamilyTitularPendingTuition(admin, payer.familyGroupId).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
