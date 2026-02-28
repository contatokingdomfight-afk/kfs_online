"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { registerForEvent } from "./actions";

type Props = { eventId: string; eventName: string; price: number; initialLocale: Locale };

export function InscreverMeButton({ eventId, eventName, price, initialLocale }: Props) {
  const t = getTranslations(initialLocale);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    const msg = t("registerConfirm").replace("{name}", eventName).replace("{price}", price.toFixed(0));
    const ok = typeof window !== "undefined" && window.confirm(msg);
    if (!ok) return;
    setError(null);
    setPending(true);
    const result = await registerForEvent(eventId);
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
        {pending ? t("registering") : t("registerMe")}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}
