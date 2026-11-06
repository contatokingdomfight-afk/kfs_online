"use client";

import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";

type Props = {
  /** id do elemento que contém o certificado (GraduationCertificate). */
  targetId: string;
  fileName: string;
  shareText: string;
  verifyUrl: string;
};

/** Gera o PNG do certificado no browser (sem custo de servidor). O NIF do aluno não vai na imagem partilhada. */
async function renderPng(targetId: string): Promise<Blob | null> {
  const node = document.querySelector<HTMLElement>(`#${CSS.escape(targetId)} [data-certificate]`);
  if (!node) return null;
  const { toBlob } = await import("html-to-image");
  const width = node.getBoundingClientRect().width || 1;
  return toBlob(node, {
    pixelRatio: Math.min(4, 2000 / width),
    cacheBust: true,
    filter: (el) => !(el instanceof HTMLElement && el.dataset.private !== undefined),
  });
}

export function CertificateActions({ targetId, fileName, shareText, verifyUrl }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await renderPng(targetId);
      if (!blob) throw new Error("no-image");
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
      } else {
        downloadBlob(blob, `${fileName}.png`);
        setMsg("Imagem descarregada. Publica-a no Instagram ou envia pelo WhatsApp a partir do telemóvel.");
      }
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") setMsg("Não foi possível criar a imagem. Tenta outra vez.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await renderPng(targetId);
      if (blob) downloadBlob(blob, `${fileName}.png`);
    } finally {
      setBusy(false);
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${verifyUrl}`)}`;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary inline-flex items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} aria-hidden /> Imprimir / PDF
        </button>
        <button type="button" className="btn btn-secondary inline-flex items-center gap-2" onClick={share} disabled={busy}>
          <Share2 size={16} aria-hidden /> {busy ? "A preparar…" : "Partilhar (Instagram, WhatsApp…)"}
        </button>
        <a className="btn btn-secondary inline-flex items-center gap-2 no-underline" href={waHref} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <button type="button" className="btn btn-secondary inline-flex items-center gap-2" onClick={download} disabled={busy}>
          <Download size={16} aria-hidden /> Imagem
        </button>
      </div>
      {msg && <p className="m-0 mt-2 text-sm text-text-secondary">{msg}</p>}
      <p className="m-0 mt-2 text-xs text-text-secondary">
        Para guardar em PDF, escolhe «Guardar como PDF» na janela de impressão. A imagem partilhada não mostra o teu NIF.
      </p>
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
