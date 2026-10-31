import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { resolveBankConfig } from "@/lib/revolut/bank-accounts";
import { revolutConsentUrl } from "@/lib/revolut/client";
import { SEDE_SCHOOL_ID } from "@/lib/school-payment-rules";
import { getSchoolScope, isNetworkScope } from "@/lib/school-scope";
import { createAdminClient } from "@/lib/supabase/admin";

/** Admin Geral: abre a página da Revolut para autorizar o acesso só de leitura à conta da escola (`?school=`, sem parâmetro é a Sede). */
export async function GET(request: NextRequest) {
  const user = await getCurrentDbUserUncached();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(new URL("/sign-in", request.url));
  if (!isNetworkScope(await getSchoolScope())) return NextResponse.redirect(new URL("/admin/financeiro/banco", request.url));
  const schoolId = request.nextUrl.searchParams.get("school") || SEDE_SCHOOL_ID;
  const cfg = await resolveBankConfig(createAdminClient(), schoolId);
  if (!cfg) return NextResponse.redirect(new URL(`/admin/financeiro/banco?school=${encodeURIComponent(schoolId)}&erro=config`, request.url));
  // A escola segue no estado: o callback só confia nela depois de o comparar com o cookie.
  const state = `${randomUUID()}.${schoolId}`;
  const res = NextResponse.redirect(revolutConsentUrl(cfg, state));
  res.cookies.set("revolut_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
