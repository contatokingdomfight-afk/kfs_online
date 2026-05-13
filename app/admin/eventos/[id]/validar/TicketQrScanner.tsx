"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { parseEventTicketQrPayload } from "@/lib/parse-event-ticket-qr";

type Props = {
  eventId: string;
  locale: Locale;
};

export function TicketQrScanner({ eventId, locale }: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const reactId = useId().replace(/:/g, "");
  const readerId = `h5qr-${reactId}`;
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const instanceRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const handledRef = useRef(false);

  const stopCamera = useCallback(async () => {
    const inst = instanceRef.current;
    instanceRef.current = null;
    if (!inst) return;
    try {
      await inst.stop();
    } catch {
      /* ignore */
    }
    try {
      inst.clear();
    } catch {
      /* ignore */
    }
    setCameraOn(false);
    handledRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const onDecoded = useCallback(
    async (text: string) => {
      if (handledRef.current) return;
      const parsed = parseEventTicketQrPayload(text, eventId);
      if (!parsed.ok) {
        setError(t("eventValidateScanQrUnreadable"));
        return;
      }
      handledRef.current = true;
      setBusy(true);
      setError(null);
      await stopCamera();
      const path = `/admin/eventos/${encodeURIComponent(parsed.targetEventId)}/validar?token=${encodeURIComponent(parsed.token)}`;
      router.push(path);
    },
    [eventId, router, stopCamera, t]
  );

  async function startCamera() {
    setError(null);
    handledRef.current = false;
    setBusy(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      await stopCamera();
      const html5 = new Html5Qrcode(readerId, { verbose: false });
      const qrbox = (viewfinderWidth: number, viewfinderHeight: number) => {
        const edge = Math.min(viewfinderWidth, viewfinderHeight);
        const size = Math.max(140, Math.floor(edge * 0.72));
        return { width: size, height: size };
      };
      try {
        await html5.start(
          { facingMode: "environment" },
          { fps: 8, qrbox },
          (decodedText) => {
            void onDecoded(decodedText);
          },
          () => {}
        );
        instanceRef.current = html5;
        setCameraOn(true);
      } catch (inner) {
        try {
          await html5.stop();
        } catch {
          /* ignore */
        }
        try {
          html5.clear();
        } catch {
          /* ignore */
        }
        throw inner;
      }
    } catch (e) {
      const name = e && typeof e === "object" && "name" in e ? String((e as { name?: string }).name) : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(t("eventValidateScanQrDenied"));
      } else {
        setError(t("eventValidateScanQrError"));
      }
      instanceRef.current = null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px solid var(--border)",
      }}
    >
      {!cameraOn ? (
        <button type="button" className="btn btn-secondary" style={{ width: "100%", minHeight: 44 }} disabled={busy} onClick={() => void startCamera()}>
          {busy ? t("eventValidateScanQrStarting") : t("eventValidateScanQrCta")}
        </button>
      ) : (
        <button type="button" className="btn btn-secondary" style={{ width: "100%", minHeight: 44 }} disabled={busy} onClick={() => void stopCamera()}>
          {t("eventValidateScanQrStop")}
        </button>
      )}
      <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>{t("eventValidateScanQrHint")}</p>
      <div
        id={readerId}
        style={{
          marginTop: 12,
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          minHeight: cameraOn || busy ? "min(45vh, 320px)" : 0,
          background: cameraOn || busy ? "var(--bg)" : undefined,
        }}
      />
      {error && (
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 14, color: "var(--danger)" }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
