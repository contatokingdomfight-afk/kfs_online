"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/theme-locale";
import { getTranslations } from "@/lib/i18n";

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
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
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
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setUploadError(data.error ?? t("avatarUploadError"));
        return;
      }
      if (data.url) {
        setAvatarUrl(data.url);
        router.refresh();
      }
    } catch {
      setUploadError(t("avatarUploadError"));
    } finally {
      setUploading(false);
    }
  };

  const preview = avatarUrl.trim();
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
