import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { startAutoPay } from "@/lib/autopay/service";
import { revolutMerchantConfigured } from "@/lib/revolut/merchant";

/** Aluno ativa o pagamento automático: devolve a página segura da Revolut para a 1.ª cobrança. */
export async function POST(request: NextRequest) {
  const [user, studentId] = await Promise.all([getCurrentDbUserUncached(), getCurrentStudentId()]);
  if (!user || !studentId) return NextResponse.json({ error: "Entra na tua conta para continuar." }, { status: 401 });
  if (!revolutMerchantConfigured) return NextResponse.json({ error: "Pagamento automático indisponível de momento." }, { status: 503 });
  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });

  try {
    const res = await startAutoPay(admin, {
      studentId,
      fullName: user.name?.trim() || user.email || "Aluno Kingdom Fight School",
      email: user.email ?? null,
      returnUrl: `${request.nextUrl.origin}/dashboard/financeiro?autopay=1`,
    });
    if (res.error || !res.url) return NextResponse.json({ error: res.error ?? "Não foi possível iniciar." }, { status: 400 });
    return NextResponse.json({ url: res.url });
  } catch (err) {
    console.error("[autopay start]", err);
    return NextResponse.json({ error: "Não foi possível ligar à Revolut. Tenta outra vez." }, { status: 500 });
  }
}
