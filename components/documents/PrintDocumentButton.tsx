"use client";

type Props = {
  label?: string;
  className?: string;
};

export function PrintDocumentButton({ label = "Imprimir / Guardar PDF", className = "btn btn-secondary" }: Props) {
  return (
    <button type="button" className={className} onClick={() => window.print()} style={{ fontSize: 13 }}>
      {label}
    </button>
  );
}
