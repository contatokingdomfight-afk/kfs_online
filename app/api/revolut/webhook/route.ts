import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBankConnection } from "@/lib/revolut/bank-accounts";
import { syncRevolutTransactions } from "@/lib/revolut/reconcile";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";

/**
 * Aviso da Revolut (TransactionCreated / TransactionStateChanged). O conteúdo do aviso não é usado:
 * serve só de gatilho para ler os movimentos diretamente da API (fonte de verdade), por isso não há
 * nada a falsificar. Limitado a uma sincronização por minuto e por escola (`?school=`, sem parâmetro é a Sede).
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const schoolId = request.nextUrl.searchParams.get("school") || SEDE_SCHOOL_ID;
  const connection = await loadBankConnection(supabase, schoolId);
  if (!connection) return NextResponse.json({ ok: true, skipped: true });
  const last = connection.lastSyncAt;
  if (last && Date.now() - Date.parse(last) < 60_000) return NextResponse.json({ ok: true, skipped: true });
  const r = await syncRevolutTransactions(supabase, schoolId);
  return NextResponse.json({ ok: !r.error });
}
