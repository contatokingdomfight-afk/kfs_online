import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

/** Assinatura desenhada é um PNG pequeno (canvas ~600x200); 1 MB dá margem generosa. */
const MAX_BYTES = 1 * 1024 * 1024;

/** Assinatura do aluno na ficha de avaliação física, recolhida pelo coach/admin (não é a sessão do aluno). */
export async function POST(request: Request) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) {
    return NextResponse.json({ error: "Sessão inválida ou sem permissão." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const studentId = (formData.get("studentId") as string)?.trim();

  if (!studentId) {
    return NextResponse.json({ error: "Aluno não identificado." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Assinatura em falta." }, { status: 400 });
  }
  if (file.type !== "image/png") {
    return NextResponse.json({ error: "Formato de assinatura inválido." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Assinatura inválida (ficheiro demasiado grande)." }, { status: 400 });
  }

  const path = `${studentId}/${randomUUID()}.png`;
  const supabase = createAdminClient();

  const { error: upErr } = await supabase.storage.from("signatures").upload(path, file, {
    upsert: false,
    contentType: "image/png",
  });

  if (upErr) {
    console.error("avaliacao-fisica signature upload:", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("signatures").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
