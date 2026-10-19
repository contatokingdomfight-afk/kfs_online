import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { getRevolutConfig, revolutConsentUrl } from "@/lib/revolut/client";

/** Admin: abre a página da Revolut para autorizar o acesso só de leitura. */
export async function GET(request: Request) {
  const user = await getCurrentDbUserUncached();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(new URL("/sign-in", request.url));
  const cfg = getRevolutConfig();
  if (!cfg) return NextResponse.redirect(new URL("/admin/financeiro/banco?erro=config", request.url));
  const state = randomUUID();
  const res = NextResponse.redirect(revolutConsentUrl(cfg, state));
  res.cookies.set("revolut_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
