"use client";

import { useState } from "react";
import { FileText, ImageDown, Loader2, Share2 } from "lucide-react";

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

export function CertificateActions({ targetId, fileName, shareText }: Props) {
  const [busy, setBusy] = useState<null | "share" | "image">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function share() {
    setBusy("share");
    setMsg(null);
    try {
      const blob = await renderPng(targetId);
      if (!blob) throw new Error("no-image");
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
      } else {
        downloadBlob(blob, `${fileName}.png`);
        setMsg("Imagem guardada — publica-a no Instagram ou envia-a a partir do telemóvel.");
      }
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") setMsg("Não foi possível criar a imagem. Tenta outra vez.");
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("image");
    setMsg(null);
    try {
      const blob = await renderPng(targetId);
      if (blob) {
        downloadBlob(blob, `${fileName}.png`);
        setMsg("Imagem guardada.");
      } else setMsg("Não foi possível criar a imagem. Tenta outra vez.");
    } catch {
      setMsg("Não foi possível criar a imagem. Tenta outra vez.");
    } finally {
      setBusy(null);
    }
  }

  const secondary = "btn btn-secondary inline-flex items-center justify-center gap-2 w-full";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="btn btn-primary inline-flex items-center justify-center gap-2 w-full"
        style={{ minHeight: 48, fontSize: 15 }}
        onClick={share}
        disabled={busy !== null}
      >
        {busy === "share" ? <Loader2 size={18} aria-hidden className="animate-spin" /> : <Share2 size={18} aria-hidden />}
        {busy === "share" ? "A preparar a imagem…" : "Partilhar certificado"}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={secondary} style={{ minHeight: 44 }} onClick={download} disabled={busy !== null}>
          {busy === "image" ? <Loader2 size={16} aria-hidden className="animate-spin" /> : <ImageDown size={16} aria-hidden />}
          Guardar imagem
        </button>
        <button type="button" className={secondary} style={{ minHeight: 44 }} onClick={() => window.print()} disabled={busy !== null}>
          <FileText size={16} aria-hidden /> PDF
        </button>
      </div>
      {msg && (
        <p role="status" className="m-0 text-sm text-text-secondary">
          {msg}
        </p>
      )}
      <p className="m-0 text-xs text-text-secondary">
        Partilha no Instagram, WhatsApp e outras apps. No PDF, escolhe «Guardar como PDF». A imagem não mostra o teu NIF.
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
