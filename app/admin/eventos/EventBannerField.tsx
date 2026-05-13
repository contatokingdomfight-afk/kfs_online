"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { rewriteSupabaseLegacyStoragePublicUrl } from "@/lib/supabase/rewrite-storage-public-url";

type Props = {
  initialBannerUrl: string;
};

export function EventBannerField({ initialBannerUrl }: Props) {
  const router = useRouter();
  const normalizedInitial = rewriteSupabaseLegacyStoragePublicUrl(initialBannerUrl) ?? initialBannerUrl;
  const [bannerUrl, setBannerUrl] = useState(normalizedInitial.trim());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = bannerUrl.trim() ? (rewriteSupabaseLegacyStoragePublicUrl(bannerUrl.trim()) ?? bannerUrl.trim()) : "";

  const pickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/eventos/banner", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setUploadError(data.error ?? "Erro ao enviar imagem.");
        return;
      }
      if (data.url) {
        setBannerUrl(rewriteSupabaseLegacyStoragePublicUrl(data.url) ?? data.url);
        router.refresh();
      }
    } catch {
      setUploadError("Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>Banner (imagem)</span>
      <input type="hidden" name="banner_url" value={bannerUrl} />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          style={{
            width: "100%",
            maxHeight: 180,
            objectFit: "cover",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
        />
      ) : (
        <div
          style={{
            height: 120,
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          Sem imagem
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onFileChange} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={pickFile} disabled={uploading}>
          {uploading ? "A enviar…" : "Carregar imagem"}
        </button>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Ou URL da imagem</span>
        <input
          type="url"
          className="input"
          placeholder="https://..."
          value={bannerUrl}
          onChange={(ev) => setBannerUrl(ev.target.value)}
          autoComplete="off"
        />
      </label>
      {uploadError && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }} role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}
