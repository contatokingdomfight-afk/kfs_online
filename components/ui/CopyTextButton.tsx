"use client";

import { useState } from "react";

type Props = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyTextButton({
  text,
  label = "Copiar",
  copiedLabel = "Copiado!",
  className = "btn btn-secondary",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className={className} onClick={handleCopy} style={{ fontSize: 13 }}>
      {copied ? copiedLabel : label}
    </button>
  );
}
