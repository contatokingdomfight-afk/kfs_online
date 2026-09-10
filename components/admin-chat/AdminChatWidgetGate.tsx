"use client";

import { usePathname } from "next/navigation";
import { AdminChatWidget } from "./AdminChatWidget";

/** Rotas onde o botão flutuante do assistente cede o lugar a outro atalho (ex.: guardar rascunho). */
const HIDDEN_ON = [/^\/admin\/alunos\/[^/]+\/avaliacao-fisica(\/|$)/];

/** Esconde o assistente de chat do admin nas páginas que já têm o seu próprio atalho flutuante. */
export function AdminChatWidgetGate() {
  const pathname = usePathname() ?? "";
  if (HIDDEN_ON.some((re) => re.test(pathname))) return null;
  return <AdminChatWidget />;
}
