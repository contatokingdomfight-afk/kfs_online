import { NextResponse } from "next/server";
import { requireAdminForRoute } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

/** Foto de produto da loja (já reduzida no browser). Devolve o URL público. */
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  const auth = await requireAdminForRoute();
  if (!auth.adminOk) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const productId = String(formData.get("productId") ?? "").replace(/[^a-zA-Z0-9-]/g, "");
  if (!(file instanceof File) || file.size === 0 || !productId) {
    return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Formato não suportado. Usa JPEG, PNG ou WebP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem demasiado grande (máx. 5 MB)." }, { status: 400 });
  }

  const path = `products/${productId}/${randomUUID()}.${extFromMime(file.type)}`;
  const supabase = createAdminClient();
  const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (upErr) {
    console.error("product image upload:", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
