import { NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { performDeleteLesson } from "@/lib/admin/delete-lesson";

export async function POST(request: Request) {
  const dbUser = await getCurrentDbUserUncached();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  let body: { lessonId?: string; returnQuery?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
  const returnQuery = typeof body.returnQuery === "string" ? body.returnQuery : undefined;

  const result = await performDeleteLesson(lessonId, returnQuery);
  return NextResponse.json(result);
}
