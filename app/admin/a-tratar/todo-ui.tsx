import type { ReactNode } from "react";
import { Activity, Cake, ClipboardCheck, CalendarClock, CreditCard, DoorOpen, FileText, Flame, Medal, ShieldAlert, ShoppingBag, Ticket, UserPlus, UserX, CalendarCheck } from "lucide-react";
import type { AdminTodoTone } from "@/lib/admin-todo";
import type { AdminTodoKind } from "@/lib/admin-todo-rules";

export const TONE_COLOR: Record<AdminTodoTone, string> = { red: "#f87171", amber: "#fbbf24", blue: "#60a5fa", green: "#4ade80" };
export const TONE_BG: Record<AdminTodoTone, string> = {
  red: "rgba(248,113,113,0.16)",
  amber: "rgba(251,191,36,0.16)",
  blue: "rgba(96,165,250,0.16)",
  green: "rgba(74,222,128,0.16)",
};

/** Ícone de cada alerta do «A tratar hoje» (elemento já resolvido: pode atravessar para client components). */
export function todoIcon(kind: AdminTodoKind, size = 20): ReactNode {
  switch (kind) {
    case "pagamentos":
      return <CreditCard size={size} aria-hidden />;
    case "seguros":
      return <ShieldAlert size={size} aria-hidden />;
    case "encomendas":
      return <ShoppingBag size={size} aria-hidden />;
    case "vencer":
      return <CalendarClock size={size} aria-hidden />;
    case "semana":
      return <Ticket size={size} aria-hidden />;
    case "risco":
      return <DoorOpen size={size} aria-hidden />;
    case "semplano":
      return <UserX size={size} aria-hidden />;
    case "carga":
      return <Flame size={size} aria-hidden />;
    case "adesao":
      return <FileText size={size} aria-hidden />;
    case "fisicas":
      return <Activity size={size} aria-hidden />;
    case "performance":
      return <ClipboardCheck size={size} aria-hidden />;
    case "exame":
      return <Medal size={size} aria-hidden />;
    case "confirmar":
      return <CalendarCheck size={size} aria-hidden />;
    case "aniversarios":
      return <Cake size={size} aria-hidden />;
    default:
      return <UserPlus size={size} aria-hidden />;
  }
}
