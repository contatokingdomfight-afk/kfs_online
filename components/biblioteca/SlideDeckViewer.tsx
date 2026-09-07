"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

type Props = {
  url: string | null;
  title: string;
  fallbackMessage?: string;
};

/**
 * Visualizador de slides: renderiza um PDF página a página (avançar/voltar), em vez do
 * iframe rolável do `PdfUnitViewer`. Reaproveita o mesmo ficheiro/upload de PDF — só muda
 * a apresentação.
 */
export function SlideDeckViewer({ url, title, fallbackMessage = "Estes slides não estão disponíveis." }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNumPages(0);
    setPageNum(1);

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const loadingTask = pdfjsLib.getDocument({ url });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) {
          loadingTask.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
      } catch {
        if (!cancelled) setError("Não foi possível carregar os slides.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      docRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (!docRef.current || !canvasRef.current || numPages === 0) return;
    let cancelled = false;

    (async () => {
      const page = await docRef.current!.getPage(pageNum);
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const containerWidth = canvas.parentElement?.clientWidth || 800;
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, containerWidth / unscaledViewport.width);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport, canvas }).promise;
    })();

    return () => {
      cancelled = true;
    };
  }, [pageNum, numPages]);

  if (!url) {
    return (
      <div
        style={{
          padding: "clamp(24px, 6vw, 32px)",
          textAlign: "center",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-md)",
          border: "1px dashed var(--border)",
        }}
      >
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{fallbackMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      {loading && (
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>A carregar slides…</p>
      )}
      {error && <p style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>{error}</p>}
      {!error && (
        <canvas
          ref={canvasRef}
          aria-label={title}
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            display: loading ? "none" : "block",
          }}
        />
      )}
      {numPages > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px, 3vw, 16px)" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            style={{ opacity: pageNum <= 1 ? 0.5 : 1 }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 14, color: "var(--text-secondary)", minWidth: "4.5rem", textAlign: "center" }}>
            {pageNum} / {numPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={pageNum >= numPages}
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            style={{ opacity: pageNum >= numPages ? 0.5 : 1 }}
          >
            Seguinte →
          </button>
        </div>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 14, color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}
      >
        Abrir PDF original →
      </a>
    </div>
  );
}
