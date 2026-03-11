"use client";

import { useFormStatus } from "react-dom";

type Props = {
  message?: string;
};

/**
 * Barra de carregamento quando o formulário pai está a ser submetido.
 * Deve ser colocado dentro do <form> para useFormStatus funcionar.
 */
export function FormLoadingBar({ message = "A guardar…" }: Props) {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div role="progressbar" aria-valuetext={message} aria-busy="true" style={{ marginBottom: 12 }}>
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 4,
          backgroundColor: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "40%",
            backgroundColor: "var(--primary)",
            animation: "form-loading-bar 1.2s ease-in-out infinite",
          }}
        />
      </div>
      <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{message}</p>
      <style>{`
        @keyframes form-loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
