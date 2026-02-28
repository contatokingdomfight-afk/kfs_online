import { NextRequest, NextResponse } from "next/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { stripe } from "@/lib/stripe/server";

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
  const session = await stripe.billingPortal.sessions.create({
    customer: student.stripeCustomerId,
    return_url: `${baseUrl}/dashboard/financeiro`,
  });

  return NextResponse.json({ url: session.url });
}
