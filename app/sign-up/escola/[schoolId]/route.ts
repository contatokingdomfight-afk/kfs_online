import { NextResponse, type NextRequest } from "next/server";
import { SIGNUP_SCHOOL_COOKIE } from "@/lib/onboarding-default-school";

/**
 * Link de inscrição de uma escola (copiado em /admin/escolas/[id]): guarda a escola num cookie
 * e segue para o registo; o onboarding pré-seleciona essa escola. Fica em /sign-up/* (já público no middleware).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const res = NextResponse.redirect(new URL("/sign-up", request.url));
  if (/^[\w-]{1,64}$/.test(schoolId)) {
    res.cookies.set(SIGNUP_SCHOOL_COOKIE, schoolId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
