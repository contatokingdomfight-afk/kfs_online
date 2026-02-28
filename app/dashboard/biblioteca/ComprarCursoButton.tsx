"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { purchaseCourse } from "./actions";

type Props = { courseId: string; courseName: string; price: number; initialLocale: Locale };

export function ComprarCursoButton({ courseId, courseName, price, initialLocale }: Props) {
  const t = getTranslations(initialLocale);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    const msg = t("buyConfirm").replace("{name}", courseName).replace("{price}", price.toFixed(0));
    const ok = typeof window !== "undefined" && window.confirm(msg);
    if (!ok) return;
    setError(null);
    setPending(true);
    const result = await purchaseCourse(courseId);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else {
      router.refresh();
      setPending(false);
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="btn btn-primary"
        style={{
          width: "100%",
          minHeight: 44,
          textAlign: "center",
          opacity: pending ? 0.8 : 1,
        }}
      >
        {pending ? t("processing") : `${t("buyFor")}${price.toFixed(0)}`}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}
