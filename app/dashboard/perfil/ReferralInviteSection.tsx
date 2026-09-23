"use client";

import { useState } from "react";
import { Handshake } from "lucide-react";

type Props = {
  referralLink: string;
  invitedCount: number;
  convertedCount: number;
  locale: "pt" | "en";
};

export function ReferralInviteSection({ referralLink, invitedCount, convertedCount, locale }: Props) {
  const L = locale === "pt";
  const [copied, setCopied] = useState(false);

  const shareText = L
    ? "Vem experimentar comigo na Kingdom Fight School — aula experimental grátis!"
    : "Come try a class with me at Kingdom Fight School — free trial class!";

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: referralLink });
        return;
      } catch {
        /* utilizador cancelou ou API falhou — cai para copiar */
      }
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível — sem feedback, mas não é crítico */
    }
  };

  return (
    <section
      className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md"
      style={{ marginTop: "clamp(20px, 5vw, 24px)" }}
    >
      <h2 className="text-base font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
        <Handshake size={16} aria-hidden />
        {L ? "Convida um amigo" : "Invite a friend"}
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        {L
          ? "Partilha o teu link. Quando o teu amigo fizer a aula experimental e se tornar aluno, ganhas XP — e, se pagares presencial, um crédito na mensalidade seguinte."
          : "Share your link. When your friend does the trial class and becomes a student, you earn XP — and, if you pay in person, a credit on your next tuition."}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          readOnly
          value={referralLink}
          onFocus={(e) => e.currentTarget.select()}
          className="input flex-1 text-sm"
          aria-label={L ? "O teu link de indicação" : "Your referral link"}
        />
        <button type="button" onClick={handleShare} className="btn btn-primary whitespace-nowrap">
          {copied ? (L ? "Copiado!" : "Copied!") : L ? "Partilhar / Copiar" : "Share / Copy"}
        </button>
      </div>
      {invitedCount > 0 && (
        <p className="text-xs text-text-secondary m-0">
          {L
            ? `${invitedCount} indicação(ões) · ${convertedCount} tornaram-se aluno(a)`
            : `${invitedCount} referral(s) · ${convertedCount} became a student`}
        </p>
      )}
    </section>
  );
}
