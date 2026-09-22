"use client";

import { useState } from "react";
import { setFighterCardPublic } from "./actions";

type Props = {
  studentId: string;
  initialEnabled: boolean;
  eligibleAge: boolean;
  cardUrl: string;
  imageUrl: string;
  locale: "pt" | "en";
};

export function FighterCardSection({ studentId, initialEnabled, eligibleAge, cardUrl, imageUrl, locale }: Props) {
  const L = locale === "pt";
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const shareText = L
    ? "Vê a minha evolução na Kingdom Fight School 🥋"
    : "Check out my progress at Kingdom Fight School 🥋";
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${cardUrl}`)}`;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await setFighterCardPublic(!enabled);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setEnabled(Boolean(result.enabled));
    } catch {
      setMessage(L ? "Erro ao guardar. Tenta novamente." : "Failed to save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function shareImage() {
    if (sharing) return;
    setSharing(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const file = new File([blob], `fighter-card-${studentId}.png`, { type: "image/png" });
          const canShareFiles =
            typeof navigator.canShare === "function" ? navigator.canShare({ files: [file] }) : true;
          if (canShareFiles) {
            await navigator.share({ files: [file], text: shareText, url: cardUrl });
            return;
          }
          await navigator.share({ text: shareText, url: cardUrl });
          return;
        } catch {
          /* utilizador cancelou ou partilha de ficheiros falhou — cai para descarregar */
        }
      }
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } finally {
      setSharing(false);
    }
  }

  return (
    <section
      className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md"
      style={{ marginTop: "clamp(20px, 5vw, 24px)" }}
    >
      <h2 className="text-base font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
        <span aria-hidden>🏆</span>
        {L ? "Fighter Card" : "Fighter Card"}
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        {L
          ? "Um cartão com a tua faixa, XP e conquistas, pronto para partilhar no Instagram Stories ou WhatsApp."
          : "A card with your belt, XP and achievements, ready to share on Instagram Stories or WhatsApp."}
      </p>

      {!eligibleAge && !enabled ? (
        <p className="text-xs text-text-secondary m-0">
          {L
            ? "Preenche a tua data de nascimento aqui em cima (e sê maior de 12 anos) para poderes activar."
            : "Fill in your date of birth above (and be over 12) to enable this."}
        </p>
      ) : (
        <>
          <button type="button" onClick={() => void toggle()} className="btn btn-secondary" disabled={busy}>
            {busy ? "…" : enabled ? (L ? "Tornar privado" : "Make private") : L ? "Tornar público" : "Make public"}
          </button>

          {enabled && (
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary whitespace-nowrap text-center"
              >
                WhatsApp
              </a>
              <button type="button" onClick={() => void shareImage()} className="btn btn-primary whitespace-nowrap" disabled={sharing}>
                {sharing ? "…" : L ? "Partilhar imagem" : "Share image"}
              </button>
            </div>
          )}
        </>
      )}

      {message && (
        <p className="text-xs mt-3 m-0" style={{ color: "var(--danger)" }} role="alert">
          {message}
        </p>
      )}
    </section>
  );
}
