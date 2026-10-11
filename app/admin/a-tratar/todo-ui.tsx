import type { ReactNode } from "react";
import { Activity, CreditCard, DoorOpen, FileText, Flame, UserPlus } from "lucide-react";
import type { AdminTodoTone } from "@/lib/admin-todo";
import type { AdminTodoKind } from "@/lib/admin-todo-rules";

export const TONE_COLOR: Record<AdminTodoTone | "green", string> = { red: "#f87171", amber: "#fbbf24", blue: "#60a5fa", green: "#4ade80" };

/** Ícone de cada alerta do «A tratar hoje» (elemento já resolvido: pode atravessar para client components). */
export function todoIcon(kind: AdminTodoKind, size = 20): ReactNode {
  switch (kind) {
    case "pagamentos":
      return <CreditCard size={size} aria-hidden />;
    case "risco":
      return <DoorOpen size={size} aria-hidden />;
    case "carga":
      return <Flame size={size} aria-hidden />;
    case "adesao":
      return <FileText size={size} aria-hidden />;
    case "fisicas":
      return <Activity size={size} aria-hidden />;
    default:
      return <UserPlus size={size} aria-hidden />;
  }
}
