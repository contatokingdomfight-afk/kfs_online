import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe or STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const result = getAdminClientOrNull();
  if (!result.client) {
    console.error("Supabase admin client not available for webhook");
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }
  const supabase = result.client;

  try {
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const studentId = sub.metadata?.studentId;
        if (!studentId) break;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const status = sub.status;
        const isActive = status === "active" || status === "trialing";
        const { data: plan } = priceId
          ? await supabase.from("Plan").select("id").eq("stripePriceId", priceId).eq("is_active", true).single()
          : { data: null };
        await supabase
          .from("Student")
          .update({
            stripeSubscriptionId: isActive ? sub.id : null,
            planId: isActive && plan?.id ? plan.id : null,
          })
          .eq("id", studentId);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const studentId = sub.metadata?.studentId;
        if (!studentId) break;
        await supabase
          .from("Student")
          .update({ stripeSubscriptionId: null, planId: null })
          .eq("id", studentId);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason !== "subscription_cycle") break;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;
        const sub = await stripe!.subscriptions.retrieve(subId);
        const studentId = sub.metadata?.studentId;
        if (!studentId) break;
        const amount = (invoice.amount_paid ?? 0) / 100;
        const periodStart = invoice.period_start;
        const referenceMonth = periodStart
          ? new Date(periodStart * 1000).toISOString().slice(0, 7)
          : new Date().toISOString().slice(0, 7);
        await supabase.from("Payment").insert({
          studentId,
          amount,
          status: "PAID",
          referenceMonth,
        });
        break;
      }
      default:
        // ignore other events
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
