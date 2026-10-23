import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { resolveAutoPayPayer } from "@/lib/autopay/service";
import { createAdvanceTuitionCheckout, createTuitionCheckout } from "@/lib/tuition-checkout/service";
import { revolutMerchantConfigured } from "@/lib/revolut/merchant";

/** Aluno paga mensalidades em atraso pela Revolut. O valor vem sempre dos pagamentos na base de dados. */
export async function POST(request: NextRequest) {
  const [user, studentId] = await Promise.all([getCurrentDbUserUncached(), getCurrentStudentId()]);
  if (!user || !studentId) return NextResponse.json({ error: "Entra na tua conta para continuar." }, { status: 401 });
  if (!revolutMerchantConfigured) return NextResponse.json({ error: "Pagamento online indisponível de momento." }, { status: 503 });
  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { paymentIds?: unknown; advance?: unknown };
  const paymentIds = Array.isArray(body.paymentIds) ? body.paymentIds.map(String).slice(0, 24) : undefined;
  const payer = await resolveAutoPayPayer(admin, studentId);
  if (payer.isFamilyMember) return NextResponse.json({ error: "A mensalidade do teu grupo familiar é paga pelo titular." }, { status: 403 });

  try {
    // Pagar adiantado a próxima mensalidade (sem atrasos): mês e valor calculados no servidor.
    if (body.advance === true) {
      const adv = await createAdvanceTuitionCheckout(admin, {
        payerStudentId: payer.payerStudentId,
        familyGroupId: payer.familyGroupId,
        createdByUserId: user.id,
        email: user.email ?? null,
        returnUrl: `${request.nextUrl.origin}/dashboard/financeiro?pago=1`,
      });
      if (adv.error || !adv.url) return NextResponse.json({ error: adv.error ?? "Não foi possível iniciar o pagamento." }, { status: 400 });
      return NextResponse.json({ url: adv.url });
    }
    const res = await createTuitionCheckout(admin, {
      payerStudentId: payer.payerStudentId,
      paymentIds,
      createdByUserId: user.id,
      email: user.email ?? null,
      returnUrl: `${request.nextUrl.origin}/dashboard/financeiro?pago=1`,
      description: "Mensalidades · Kingdom Fight School",
    });
    if (res.error || !res.url) return NextResponse.json({ error: res.error ?? "Não foi possível iniciar o pagamento." }, { status: 400 });
    return NextResponse.json({ url: res.url });
  } catch (err) {
    console.error("[tuition-checkout]", err);
    return NextResponse.json({ error: "Não foi possível ligar à Revolut. Tenta outra vez." }, { status: 500 });
  }
}
