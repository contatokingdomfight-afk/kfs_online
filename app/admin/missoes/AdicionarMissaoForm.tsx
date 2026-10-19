"use client";

import { useActionState } from "react";
import { createMission } from "./actions";

export function AdicionarMissaoForm({
  modalityOptions,
}: {
  modalityOptions: { code: string; name: string }[];
}) {
  const [state, formAction] = useActionState(createMission, null);

  return (
    <form action={formAction} className="rounded-xl bg-bg-secondary border border-border p-4 space-y-4">
      <h2 className="text-base font-semibold text-text-primary">Nova missão</h2>
      {state?.error && (
        <p className="text-sm text-red-500" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          Missão criada.
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Nome *</label>
        <input
          type="text"
          name="name"
          required
          maxLength={200}
          className="input w-full"
          placeholder="Ex.: Assistir a 5 aulas este mês"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Descrição (opcional)</label>
        <textarea
          name="description"
          rows={2}
          maxLength={500}
          className="input w-full"
          placeholder="O que o atleta precisa fazer?"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Modalidade</label>
          <select name="modality" className="input w-full">
            <option value="">Todas</option>
            {modalityOptions.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Nível mínimo</label>
          <input type="number" name="minLevel" min={1} step={1} placeholder="Qualquer nível" className="input w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">XP (recompensa)</label>
          <input type="number" name="xpReward" min={1} max={10000} defaultValue={50} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Ordem</label>
          <input type="number" name="sortOrder" min={0} defaultValue={0} className="input w-full" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary">
        Criar missão
      </button>
    </form>
  );
}
