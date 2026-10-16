import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { ACADEMY_PASS_PRICES, canBuyCourse, hasActiveAcademyPass, loadPublicCourses, loadPurchasedCourseIds } from "@/lib/academy/access";

/**
 * Checkout da Kingdom Academy para qualquer conta com login:
 * - { type: "course", courseId } → pagamento único;
 * - { type: "pass", interval: "month" | "year" } → subscrição do Passe.
 * Os preços vêm sempre da base de dados / constantes, nunca do cliente.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentDbUserUncached();
  if (!user) return NextResponse.json({ error: "Entra na tua conta para continuar." }, { status: 401 });
  if (!stripe) return NextResponse.json({ error: "Pagamento por cartão não configurado." }, { status: 503 });
  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { type?: string; courseId?: string; interval?: string };
  const origin = request.nextUrl.origin;
  const customerEmail = user.email ?? undefined;

  try {
    if (body.type === "pass") {
      const interval = body.interval === "year" ? "year" : "month";
      if (await hasActiveAcademyPass(admin, user.id)) return NextResponse.json({ error: "Já tens o Passe ativo." }, { status: 400 });
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: customerEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: Math.round(ACADEMY_PASS_PRICES[interval] * 100),
              recurring: { interval },
              product_data: { name: `Passe Kingdom Academy (${interval === "year" ? "anual" : "mensal"})` },
            },
          },
        ],
        success_url: `${origin}/academy?passe=ok`,
        cancel_url: `${origin}/academy/planos`,
        subscription_data: { metadata: { subscriptionRole: "academy_pass", userId: user.id, interval } },
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: session.url });
    }

    if (body.type === "course" && body.courseId) {
      const [course] = await loadPublicCourses(admin, { courseId: body.courseId });
      if (!course || !canBuyCourse(course)) return NextResponse.json({ error: "Este curso não está disponível para compra." }, { status: 400 });
      if ((await loadPurchasedCourseIds(admin, user.id)).has(course.id)) return NextResponse.json({ error: "Já tens acesso a este curso." }, { status: 400 });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: customerEmail,
        line_items: [
          {
            quantity: 1,
            price_data: { currency: "eur", unit_amount: Math.round((course.price ?? 0) * 100), product_data: { name: course.name } },
          },
        ],
        success_url: `${origin}/academy/${course.id}?pago=1`,
        cancel_url: `${origin}/academy/${course.id}`,
        metadata: { kind: "academy_course", courseId: course.id, userId: user.id },
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  } catch (err) {
    console.error("academy-checkout error:", err);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
