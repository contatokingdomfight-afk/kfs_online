"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { MAX_PRODUCT_IMAGES, type ProductImage } from "@/lib/retail/product-images";
import { saveProductImages } from "../actions";

/** Reduz no browser para no máximo 1400 px (JPEG ~85%): fotos leves no telemóvel, sem processar no servidor. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
}

const small: React.CSSProperties = { minHeight: 30, padding: "0 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 };

export function ProductImagesEditor({ productId, initial, colors }: { productId: string; initial: ProductImage[]; colors: string[] }) {
  const [images, setImages] = useState<ProductImage[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function persist(next: ProductImage[]) {
    const prev = images;
    setImages(next);
    setError(null);
    startTransition(async () => {
      const r = await saveProductImages(productId, next);
      if (r.error) {
        setImages(prev);
        setError(r.error);
      }
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const added: ProductImage[] = [];
    try {
      for (const file of [...files].slice(0, MAX_PRODUCT_IMAGES - images.length)) {
        const blob = await shrink(file);
        const fd = new FormData();
        fd.append("productId", productId);
        fd.append("file", new File([blob], "foto.jpg", { type: blob.type || "image/jpeg" }));
        const res = await fetch("/api/admin/loja/imagem", { method: "POST", body: fd });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? "Falha no envio.");
        added.push({ url: json.url, color: colors.length === 1 ? colors[0] : null });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
    if (added.length) persist([...images, ...added]);
  }

  const busy = uploading || pending;

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        Fotos ({images.length}/{MAX_PRODUCT_IMAGES}) · a primeira é a principal
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {images.map((img, i) => (
          <div key={img.url} style={{ width: 132, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ position: "relative", width: 132, height: 132, borderRadius: 10, overflow: "hidden", border: i === 0 ? "2px solid var(--primary)" : "1px solid var(--border)", background: "var(--bg)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de pré-visualização */}
              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {i === 0 ? (
                <span style={{ position: "absolute", left: 6, top: 6, padding: "2px 7px", borderRadius: 999, background: "var(--primary)", color: "#fff", fontSize: 10, fontWeight: 700 }}>Principal</span>
              ) : null}
            </div>
            {colors.length > 1 && (
              <select
                className="input"
                aria-label="Cor desta foto"
                value={img.color ?? ""}
                disabled={busy}
                onChange={(e) => persist(images.map((x, j) => (j === i ? { ...x, color: e.target.value || null } : x)))}
                style={{ minHeight: 30, fontSize: 12, padding: "0 6px" }}
              >
                <option value="">Todas as cores</option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              {i > 0 && (
                <button type="button" style={small} disabled={busy} onClick={() => persist([img, ...images.filter((_, j) => j !== i)])} title="Tornar principal">
                  <Star size={13} aria-hidden /> Principal
                </button>
              )}
              <button type="button" style={small} disabled={busy} onClick={() => persist(images.filter((_, j) => j !== i))} aria-label="Remover foto">
                <Trash2 size={13} aria-hidden />
              </button>
            </div>
          </div>
        ))}
        {images.length < MAX_PRODUCT_IMAGES && (
          <label style={{ width: 132, height: 132, borderRadius: 10, border: "1px dashed var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: busy ? "wait" : "pointer", color: "var(--text-secondary)", fontSize: 12, textAlign: "center" }}>
            <ImagePlus size={24} aria-hidden />
            {uploading ? "A enviar…" : "Adicionar foto"}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(e) => onFiles(e.target.files)} style={{ display: "none" }} />
          </label>
        )}
      </div>
      {error ? <span role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>{error}</span> : null}
    </div>
  );
}
