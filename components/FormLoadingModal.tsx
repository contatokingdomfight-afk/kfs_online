"use client";

import { useFormStatus } from "react-dom";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type Props = {
  message?: string;
};

/**
 * Mostra um modal de carregamento quando o formulário pai está a ser submetido.
 * Deve ser colocado dentro do <form> para useFormStatus funcionar.
 */
export function FormLoadingModal({ message = "A guardar…" }: Props) {
  const { pending } = useFormStatus();
  return <LoadingOverlay open={pending} message={message} />;
}
