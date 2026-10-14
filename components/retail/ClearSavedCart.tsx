"use client";

import { useEffect } from "react";

/** Depois de enviar a encomenda, limpa o carrinho guardado no telemóvel (chaves `kfs-loja-carrinho*`). */
export function ClearSavedCart() {
  useEffect(() => {
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("kfs-loja-carrinho")) window.localStorage.removeItem(k);
      }
    } catch {
      /* ignora */
    }
  }, []);
  return null;
}
