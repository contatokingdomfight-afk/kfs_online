import { NextResponse } from "next/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { cancelAutoPay, loadAutoPayForStudent, resolveAutoPayPayer } from "@/lib/autopay/service";

/** Aluno (ou titular do grupo) cancela o pagamento automático. As mensalidades pagas ficam. */
export async function POST() {
  const studentId = await getCurrentStudentId();
  if (!studentId) return NextResponse.json({ error: "Entra na tua conta para continuar." }, { status: 401 });
  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });

  const payer = await resolveAutoPayPayer(admin, studentId);
  if (payer.isFamilyMember) return NextResponse.json({ error: "Só o titular do grupo familiar pode cancelar." }, { status: 403 });
  const row = await loadAutoPayForStudent(admin, payer.payerStudentId);
  if (!row || row.state === "CANCELLED") return NextResponse.json({ ok: true });
  const res = await cancelAutoPay(admin, row);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
