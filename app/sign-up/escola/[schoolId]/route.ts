import { NextResponse, type NextRequest } from "next/server";
import { SIGNUP_SCHOOL_COOKIE } from "@/lib/onboarding-default-school";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

/**
 * Link de inscrição de uma escola (copiado em /admin/escolas/[id], usado no site da escola):
 * aceita o nome curto (School.slug, ex.: kfs-lisboa) ou o id. Guarda a escola num cookie e segue para o
 * registo; o onboarding pré-seleciona essa escola. Fica em /sign-up/* (já público no middleware).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId: key } = await params;
  const res = NextResponse.redirect(new URL("/sign-up", request.url));
  if (!/^[\w-]{1,64}$/.test(key)) return res;

  let schoolId = key;
  const admin = getAdminClientOrNull().client;
  if (admin) {
    const { data } = await admin.from("School").select("id").eq("slug", key.toLowerCase()).maybeSingle();
    if (data?.id) schoolId = data.id as string;
  }

  res.cookies.set(SIGNUP_SCHOOL_COOKIE, schoolId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
