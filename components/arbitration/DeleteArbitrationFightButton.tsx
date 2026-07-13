"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteArbitrationFight } from "@/app/coach/arbitragem/actions";

type Props = {
  fightId: string;
  label: string;
  className?: string;
};

export function DeleteArbitrationFightButton({ fightId, label, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Apagar o combate «${label}»?\n\nEsta ação remove também as pontuações e não pode ser desfeita.`)) {
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        await deleteArbitrationFight(fightId);
        router.refresh();
      } catch (err) {
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
        onClick={handleDelete}
        aria-label={`Apagar combate ${label}`}
      >
        {pending ? "A apagar…" : "Apagar"}
      </button>
      {error ? (
        <span className="arb-delete-fight-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
