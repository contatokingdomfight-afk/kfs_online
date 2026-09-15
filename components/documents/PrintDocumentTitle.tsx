"use client";

import { useEffect } from "react";

/** Define document.title para o nome sugerido ao guardar PDF na impressão. */
export function PrintDocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return null;
}
