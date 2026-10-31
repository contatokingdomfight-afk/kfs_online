import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAllRevolutConnections } from "@/lib/revolut/reconcile";

/** Cron diário de segurança: lê os movimentos da conta de cada escola mesmo que algum aviso automático falhe. */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await syncAllRevolutConnections(createAdminClient()));
}
