import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncRevolutTransactions } from "@/lib/revolut/reconcile";

/**
 * Aviso da Revolut (TransactionCreated / TransactionStateChanged). O conteúdo do aviso não é usado:
 * serve só de gatilho para ler os movimentos diretamente da API (fonte de verdade), por isso não há
 * nada a falsificar. Limitado a uma sincronização por minuto.
 */
export async function POST() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("RevolutConnection").select("lastSyncAt").eq("id", "default").maybeSingle();
  const last = (data as { lastSyncAt?: string | null } | null)?.lastSyncAt;
  if (last && Date.now() - Date.parse(last) < 60_000) return NextResponse.json({ ok: true, skipped: true });
  const r = await syncRevolutTransactions(supabase);
  return NextResponse.json({ ok: !r.error });
}
