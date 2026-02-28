import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { stripe } from "@/lib/stripe/server";

export async function POST(request: NextRequest) {
  const studentId = await getCurrentStudentId();
  if (!studentId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }
  const planId = body.planId?.trim();
  if (!planId) {
    return NextResponse.json({ error: "planId é obrigatório." }, { status: 400 });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Pagamento por cartão não configurado." }, { status: 503 });
  }

  const result = getAdminClientOrNull();
  if (!result.client) {
    return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });
  }
  const supabase = result.client;

  const { data: plan } = await supabase
    .from("Plan")
    .select("id, name, stripePriceId")
    .eq("id", planId)
    .eq("is_active", true)
    .single();
  if (!plan?.stripePriceId) {
    return NextResponse.json(
      { error: "Plano não disponível para pagamento por cartão. Contacta a secretaria." },
      { status: 400 }
    );
  }

  const { data: student } = await supabase
    .from("Student")
    .select("id, stripeCustomerId, userId")
    .eq("id", studentId)
    .single();
  if (!student) {
    return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  }

  const baseUrl = request.nextUrl.origin;
  let customerId = student.stripeCustomerId as string | null | undefined;

  if (!customerId) {
    const { data: user } = await supabase
      .from("User")
      .select("email, name")
      .eq("id", student.userId)
      .single();
    const customer = await stripe.customers.create({
      email: user?.email ?? undefined,
      name: user?.name ?? undefined,
      metadata: { studentId },
    });
    customerId = customer.id;
    await supabase.from("Student").update({ stripeCustomerId: customerId }).eq("id", studentId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/financeiro?stripe=success`,
    cancel_url: `${baseUrl}/dashboard/financeiro?stripe=cancel`,
    subscription_data: {
      metadata: { studentId },
      trial_period_days: undefined,
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
