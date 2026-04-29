import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { stripe } from "@/lib/stripe/server";
import { isStripeCustomerInvalidForKey } from "@/lib/stripe/stripe-customer-errors";
import { KINGDOM_PLAN_PRESENCIAL_I_ID } from "@/lib/kingdom-plans-constants";

function addonPriceId(): string | null {
  const p = process.env.STRIPE_DIGITAL_LIBRARY_ADDON_PRICE_ID?.trim();
  return p && p.length > 0 ? p : null;
}

/**
 * Subscrição Stripe separada: biblioteca digital (+20€) para alunos com Kingdom Presencial I.
 * Configurar em Stripe o produto/preço recorrente e colocar o price id em STRIPE_DIGITAL_LIBRARY_ADDON_PRICE_ID.
 */
export async function POST(request: NextRequest) {
  const studentId = await getCurrentStudentId();
  if (!studentId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const priceId = addonPriceId();
  if (!priceId) {
    return NextResponse.json(
      { error: "Add-on biblioteca digital não configurado (STRIPE_DIGITAL_LIBRARY_ADDON_PRICE_ID)." },
      { status: 503 }
    );
  }

  if (!stripe) {
    return NextResponse.json({ error: "Pagamento por cartão não configurado." }, { status: 503 });
  }

  const result = getAdminClientOrNull();
  if (!result.client) {
    return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });
  }
  const supabaseServer = await createClient();
  const { data: student } = await supabaseServer
    .from("Student")
    .select("id, planId, userId, stripeCustomerId, digitalLibraryAddon")
    .eq("id", studentId)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }
  if (student.planId !== KINGDOM_PLAN_PRESENCIAL_I_ID) {
    return NextResponse.json(
      { error: "Este add-on está disponível apenas para o plano Kingdom Presencial I." },
      { status: 400 }
    );
  }
  if (student.digitalLibraryAddon) {
    return NextResponse.json({ error: "Já tens a biblioteca digital ativa no teu plano." }, { status: 400 });
  }

  const supabase = result.client;
  const baseUrl = request.nextUrl.origin;
  let customerId = student.stripeCustomerId as string | null | undefined;

  async function createStripeCustomerAndPersist(userId: string): Promise<string> {
    const { data: user } = await supabase.from("User").select("email, name").eq("id", userId).single();
    const customer = await stripe!.customers.create({
      email: user?.email ?? undefined,
      name: user?.name ?? undefined,
      metadata: { studentId },
    });
    await supabase.from("Student").update({ stripeCustomerId: customer.id }).eq("id", studentId);
    return customer.id;
  }

  if (!customerId) {
    customerId = await createStripeCustomerAndPersist(student.userId);
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId!,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/dashboard/biblioteca?library_addon=success`,
        cancel_url: `${baseUrl}/dashboard/biblioteca?library_addon=cancel`,
        subscription_data: {
          metadata: { studentId, subscriptionRole: "digital_library_addon" },
        },
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: session.url });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (/No such price|No such Price/i.test(raw) || (/resource_missing/i.test(raw) && /price_/i.test(raw))) {
        return NextResponse.json(
          { error: "Preço Stripe do add-on inválido para esta conta. Confirma STRIPE_DIGITAL_LIBRARY_ADDON_PRICE_ID." },
          { status: 400 }
        );
      }
      if (attempt === 0 && customerId && isStripeCustomerInvalidForKey(raw)) {
        await supabase.from("Student").update({ stripeCustomerId: null }).eq("id", studentId);
        customerId = await createStripeCustomerAndPersist(student.userId);
        continue;
      }
      return NextResponse.json({ error: raw }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Erro inesperado ao criar sessão de pagamento." }, { status: 500 });
}
