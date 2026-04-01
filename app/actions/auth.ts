"use server";

import { createClient } from "@/lib/supabase/server";

/** Termina sessão Supabase (cookies no pedido). A navegação para `/sign-in` faz-se no cliente para evitar confundir `NEXT_REDIRECT` com erro. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
