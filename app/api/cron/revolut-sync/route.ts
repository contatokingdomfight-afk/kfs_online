import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncRevolutTransactions } from "@/lib/revolut/reconcile";

/** Cron diário de segurança: lê os movimentos da Revolut mesmo que algum aviso automático falhe. */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const r = await syncRevolutTransactions(createAdminClient());
  return NextResponse.json(r);
}
