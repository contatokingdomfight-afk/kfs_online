import { NextResponse } from "next/server";
import { requireAdminForRoute } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function POST(request: Request) {
  const auth = await requireAdminForRoute();
  if (!auth.adminOk) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
    return NextResponse.json({ error: "Imagem demasiado grande (máx. 3 MB)." }, { status: 400 });
  }

  const path = `events/${randomUUID()}.${extFromMime(file.type)}`;
  const supabase = createAdminClient();

  const { error: upErr } = await supabase.storage.from("event-banners").upload(path, file, {
    upsert: false,
    contentType: file.type,
  });

  if (upErr) {
    console.error("event banner upload:", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("event-banners").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
