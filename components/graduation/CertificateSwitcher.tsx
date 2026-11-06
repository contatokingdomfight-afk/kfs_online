"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CertificateActions } from "./CertificateActions";

type Variant = "dark" | "light";
const STORAGE_KEY = "kfs:certificado:fundo";

/** Escolha do fundo do certificado (escuro/branco). Imprimir e partilhar usam a versão escolhida. */
export function CertificateSwitcher({
  dark,
  light,
  fileName,
  shareText,
  verifyUrl,
}: {
  dark: ReactNode;
  light: ReactNode;
  fileName: string;
  shareText: string;
  verifyUrl: string;
}) {
  const [variant, setVariant] = useState<Variant>("dark");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "light") setVariant("light");
    } catch {
      /* sem armazenamento */
    }
  }, []);

  function choose(v: Variant) {
    setVariant(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* sem armazenamento */
    }
  }

  const option = (v: Variant, label: string) => (
    <button
      type="button"
      onClick={() => choose(v)}
      aria-pressed={variant === v}
      className="rounded-full border px-3 py-1 text-xs font-semibold"
      style={{
        borderColor: variant === v ? "var(--text-primary)" : "var(--border)",
        color: variant === v ? "var(--text-primary)" : "var(--text-secondary)",
        background: "transparent",
      }}
    >
      <span
        aria-hidden
        className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-[-1px]"
        style={{ background: v === "dark" ? "#0b0b0b" : "#ffffff", border: "1px solid var(--border)" }}
      />
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2" role="group" aria-label="Fundo do certificado">
        <span className="text-xs text-text-secondary">Fundo:</span>
        {option("dark", "Escuro")}
        {option("light", "Branco")}
      </div>
      <div id="certificado-graduacao">{variant === "light" ? light : dark}</div>
      <div className="mt-3">
        <CertificateActions
          targetId="certificado-graduacao"
          fileName={`${fileName}${variant === "light" ? "-branco" : ""}`}
          shareText={shareText}
          verifyUrl={verifyUrl}
        />
      </div>
    </div>
  );
}
