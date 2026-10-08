"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Enquanto a adesão não estiver concluída, a página inicial é só de leitura: qualquer clique num
 * link ou botão do conteúdo leva para /adesao (excepto elementos com `data-adesao-allowed`).
 * As acções que gravam dados também são bloqueadas no servidor (middleware) — isto é só para a
 * experiência não parecer "partida".
 */
export function PendingAdesaoClickGuard({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <div
      onClickCapture={(e) => {
        const target = e.target as HTMLElement | null;
        const interactive = target?.closest("a, button, [role='button'], input, select, textarea, label");
        if (!interactive || interactive.closest("[data-adesao-allowed]")) return;
        e.preventDefault();
        e.stopPropagation();
        router.push(href);
      }}
    >
      {children}
    </div>
  );
}
