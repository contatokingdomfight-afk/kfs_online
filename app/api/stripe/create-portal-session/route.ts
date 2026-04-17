import { NextRequest, NextResponse } from "next/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { stripe } from "@/lib/stripe/server";
import { isStripeCustomerInvalidForKey } from "@/lib/stripe/stripe-customer-errors";

export async function POST(request: NextRequest) {
  const studentId = await getCurrentStudentId();
  if (!studentId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Pagamento por cartão não configurado." }, { status: 503 });
  }

  const result = getAdminClientOrNull();
  if (!result.client) {
    return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });
  }
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, stripeCustomerId")
    .eq("id", studentId)
    .single();
  if (!student?.stripeCustomerId) {
    return NextResponse.json(
      { error: "Ainda não tens pagamentos por cartão. Subscreve um plano primeiro." },
      { status: 400 }
    );
  }

  const baseUrl = request.nextUrl.origin;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: student.stripeCustomerId,
      return_url: `${baseUrl}/dashboard/financeiro`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (isStripeCustomerInvalidForKey(raw)) {
      await supabase.from("Student").update({ stripeCustomerId: null }).eq("id", studentId);
      console.warn("[create-portal-session] stripeCustomerId inválido para a chave em uso; limpo.", {
        studentId,
      });
      return NextResponse.json(
        {
          error:
            "O registo de cliente do cartão estava desatualizado (por exemplo, teste vs produção). Volta a subscrever com cartão na página do plano ou em Financeiro para voltar a ativar o portal.",
        },
        { status: 400 }
      );
    }
    console.error("[create-portal-session] Stripe error:", err);
    return NextResponse.json({ error: raw }, { status: 500 });
  }
}
