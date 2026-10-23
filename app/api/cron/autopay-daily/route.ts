import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAutoPayToSync, remindUpcomingCharge, syncAutoPaySafe } from "@/lib/autopay/service";
import { revolutMerchantConfigured } from "@/lib/revolut/merchant";

/**
 * Cron diário do pagamento automático (Subscrições Revolut):
 * - sincroniza cada subscrição (cobranças do mês, falhas, valor do plano, dia de cobrança nos meses curtos);
 * - avisa no sino 3 dias antes de cada cobrança.
 * A Revolut não envia evento nas renovações bem-sucedidas, por isso este cron é a rede de segurança do webhook.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!revolutMerchantConfigured) return NextResponse.json({ ok: true, skipped: "revolut not configured" });

  const supabase = createAdminClient();
  const rows = await loadAutoPayToSync(supabase);
  let reminded = 0;
  for (const row of rows) {
    const synced = await syncAutoPaySafe(supabase, row);
    if (await remindUpcomingCharge(supabase, synced).catch(() => false)) reminded++;
  }
  return NextResponse.json({ ok: true, synced: rows.length, reminded });
}
