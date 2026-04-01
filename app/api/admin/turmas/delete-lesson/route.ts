import { NextResponse } from "next/server";
import { requireAdminForRoute } from "@/lib/supabase/route-handler";
import { performCancelOccurrence, performDeleteLessonDefinition } from "@/lib/admin/delete-lesson";

export async function POST(request: Request) {
  const auth = await requireAdminForRoute();
  if (!auth.adminOk) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    lessonId?: string;
    returnQuery?: string;
    action?: string;
    occurrenceDate?: string;
  };
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
  const action = body.action === "cancelOccurrence" ? "cancelOccurrence" : "deleteDefinition";
  const occurrenceDate =
    typeof body.occurrenceDate === "string" ? body.occurrenceDate.trim().slice(0, 10) : "";

  try {
    if (action === "cancelOccurrence") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) {
        return NextResponse.json({ error: "occurrenceDate inválido." }, { status: 400 });
      }
      const result = await performCancelOccurrence(lessonId, occurrenceDate, returnQuery);
      return NextResponse.json(result);
    }
    const result = await performDeleteLessonDefinition(lessonId, returnQuery);
    return NextResponse.json(result);
  } catch (e) {
    console.error("delete-lesson:", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
