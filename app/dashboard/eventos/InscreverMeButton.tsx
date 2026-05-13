"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModal";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { registerForEvent } from "./actions";

type Props = { eventId: string; eventName: string; price: number; initialLocale: Locale };

export function InscreverMeButton({ eventId, eventName, price, initialLocale }: Props) {
  const t = getTranslations(initialLocale);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const confirmMessage = t("registerConfirm").replace("{name}", eventName).replace("{price}", price.toFixed(0));

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    const result = await registerForEvent(eventId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    setSuccessOpen(true);
    router.refresh();
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        disabled={loading}
        className="btn btn-primary"
        style={{
          width: "100%",
          minHeight: 44,
          textAlign: "center",
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? t("registering") : t("registerMe")}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--danger)" }}>{error}</p>
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={t("registerModalTitle")}
        message={confirmMessage}
        confirmLabel={t("registerModalConfirmLabel")}
        cancelLabel={t("registerModalCancelLabel")}
        variant="primary"
        loading={loading}
      />

      <SuccessConfirmModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={t("registerSuccessTitle")}
        message={t("registerSuccessMessage")}
        closeLabel={t("registerSuccessClose")}
      />
    </div>
  );
}
