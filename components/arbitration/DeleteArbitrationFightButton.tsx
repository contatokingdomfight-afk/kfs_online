"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteArbitrationFight } from "@/app/coach/arbitragem/actions";
import { ConfirmModal } from "@/components/ConfirmModal";

type Props = {
  fightId: string;
  label: string;
  className?: string;
};

export function DeleteArbitrationFightButton({ fightId, label, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      setError(null);
      try {
        await deleteArbitrationFight(fightId);
        setConfirmOpen(false);
        router.refresh();
      } catch (err) {
        setConfirmOpen(false);
        setError(err instanceof Error ? err.message : "Erro ao apagar combate");
      }
    });
  };

  return (
    <span className="arb-delete-fight-wrap">
      <button
        type="button"
        className={className ?? "btn btn-danger arb-btn-delete-fight"}
        disabled={pending}
        onClick={handleOpen}
        aria-label={`Apagar combate ${label}`}
      >
        Apagar
      </button>
      {error && !confirmOpen ? (
        <span className="arb-delete-fight-error" role="alert">
          {error}
        </span>
      ) : null}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => {
          if (!pending) {
            setConfirmOpen(false);
            setError(null);
          }
        }}
        onConfirm={handleConfirm}
        title="Apagar combate?"
        message={`O combate «${label}» será removido permanentemente, incluindo todas as pontuações dos juízes. Esta ação não pode ser desfeita.`}
        confirmLabel="Apagar combate"
        cancelLabel="Cancelar"
        variant="danger"
        loading={pending}
      />
    </span>
  );
}
