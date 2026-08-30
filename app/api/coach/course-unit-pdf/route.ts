import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { assertCourseUnitActor } from "@/lib/auth/course-unit-authorization";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel limita o corpo de Route Handlers (Node runtime) a ~4.5 MB — ficamos com margem
// abaixo disso (o mesmo motivo pelo qual event-banners/avatars usam limites baixos).
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const dbUser = await getCurrentDbUserUncached();
  if (!dbUser) {
    return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const courseId = (formData.get("courseId") as string)?.trim();
  const moduleId = (formData.get("moduleId") as string)?.trim();

  if (!courseId || !moduleId) {
    return NextResponse.json({ error: "Curso e módulo são obrigatórios." }, { status: 400 });
  }

  const actor = await assertCourseUnitActor(dbUser, courseId, moduleId);
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: 403 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Formato não suportado. Envia um ficheiro PDF." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Ficheiro demasiado grande (máx. 4 MB). Exporta o PDF com menos qualidade de imagem." }, { status: 400 });
  }

  const path = `pdfs/${courseId}/${randomUUID()}.pdf`;
  const supabase = createAdminClient();

  const { error: upErr } = await supabase.storage.from("course-materials").upload(path, file, {
    upsert: false,
    contentType: "application/pdf",
  });

  if (upErr) {
    console.error("course unit pdf upload:", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("course-materials").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
