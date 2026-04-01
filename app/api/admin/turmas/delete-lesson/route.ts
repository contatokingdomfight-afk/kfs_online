import { NextResponse } from "next/server";
import { requireAdminForRoute } from "@/lib/supabase/route-handler";
import { performDeleteLesson } from "@/lib/admin/delete-lesson";

export async function POST(request: Request) {
  const auth = await requireAdminForRoute();
  if (!auth.adminOk) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { lessonId?: string; returnQuery?: string };
  try {
    body = await request.json();
  } catch (e) {
    console.error("delete-lesson: body parse error", e);
    return NextResponse.json({ error: "Corpo do pedido inválido (não é JSON)." }, { status: 400 });
  }

  const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId em falta." }, { status: 400 });
  }

  const returnQuery = typeof body.returnQuery === "string" ? body.returnQuery : undefined;

  try {
    const result = await performDeleteLesson(lessonId, returnQuery);
    return NextResponse.json(result);
  } catch (e) {
    console.error("delete-lesson: performDeleteLesson error", e);
    return NextResponse.json({ error: "Erro interno ao apagar aula." }, { status: 500 });
  }
}
