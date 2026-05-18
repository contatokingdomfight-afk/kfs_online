import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Formato não suportado. Usa JPEG, PNG, WebP ou GIF." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem demasiado grande (máx. 2 MB)." }, { status: 400 });
  }

  const path = `${user.id}/avatar`;

  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (upErr) {
    console.error("avatar upload:", upErr);
    const raw = upErr.message ?? "";
    const lower = raw.toLowerCase();
    const error =
      lower.includes("bucket") && (lower.includes("not found") || lower.includes("does not exist"))
        ? "O armazenamento de fotos de perfil não está disponível neste ambiente. Contacta o suporte técnico."
        : raw || "Erro ao enviar a imagem.";
    return NextResponse.json({ error }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { data: dbUser, error: findErr } = await supabase
    .from("User")
    .select("id")
    .eq("authUserId", user.id)
    .maybeSingle();

  if (findErr || !dbUser) {
    console.error("avatar upload user lookup:", findErr);
    return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
  }

  const { error: updateErr } = await supabase.from("User").update({ avatarUrl: publicUrl }).eq("id", dbUser.id);
  if (updateErr) {
    console.error("avatar upload user update:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/perfil");
  revalidatePath("/coach", "layout");
  revalidatePath("/coach/configuracoes");

  return NextResponse.json({ url: publicUrl });
}
