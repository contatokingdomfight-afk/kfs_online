"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/theme-locale";
import { getTranslations } from "@/lib/i18n";
import { rewriteSupabaseLegacyStoragePublicUrl } from "@/lib/supabase/rewrite-storage-public-url";

/** Reduz a foto no telemóvel (máx. 1000 px, JPEG): as fotos da câmara passam facilmente dos 2 MB. GIFs ficam como estão. */
async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  initialAvatarUrl: string;
  displayName: string;
  locale: Locale;
};

export function ProfileAvatarField({ initialAvatarUrl, displayName, locale }: Props) {
  const router = useRouter();
  const t = getTranslations(locale);
  const normalizedInitial = rewriteSupabaseLegacyStoragePublicUrl(initialAvatarUrl) ?? initialAvatarUrl;
  const [avatarUrl, setAvatarUrl] = useState(normalizedInitial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", await shrinkImage(file));
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setUploadError(data.error ?? t("avatarUploadError"));
        return;
      }
      if (data.url) {
        setAvatarUrl(rewriteSupabaseLegacyStoragePublicUrl(data.url) ?? data.url);
        router.refresh();
      }
    } catch {
      setUploadError(t("avatarUploadError"));
    } finally {
      setUploading(false);
    }
  };

  const previewRaw = avatarUrl.trim();
  const preview = previewRaw ? (rewriteSupabaseLegacyStoragePublicUrl(previewRaw) ?? previewRaw) : "";
  const size = 96;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
        {t("avatarLabel")}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            border: "2px solid var(--border)",
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--bg-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" width={size} height={size} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          ) : (
            initialsFromName(displayName)
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onFileChange} />
          <button type="button" className="btn btn-secondary" onClick={pickFile} disabled={uploading} style={{ alignSelf: "flex-start" }}>
            {uploading ? t("avatarUploading") : t("avatarUploadButton")}
          </button>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{t("avatarUrlHint")}</span>
          <input
            type="url"
            name="avatarUrl"
            className="input"
            placeholder="https://..."
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      {uploadError && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }} role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}
