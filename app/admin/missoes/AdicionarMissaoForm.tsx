"use client";

import { useFormState } from "react-dom";
import { createMission } from "./actions";

const BELT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Qualquer faixa" },
  { value: "0", label: "Branca" },
  { value: "1", label: "Branca/amarela" },
  { value: "2", label: "Amarela" },
  { value: "3", label: "Amarela/verde" },
  { value: "4", label: "Verde" },
  { value: "5", label: "Verde/azul" },
  { value: "6", label: "Azul" },
  { value: "7", label: "Azul/vermelha" },
  { value: "8", label: "Vermelha" },
  { value: "9", label: "Vermelha/preta" },
  { value: "10", label: "Preta" },
  { value: "11", label: "Preta/Dourado" },
  { value: "12", label: "Dourado 1" },
  { value: "13", label: "Dourado 2" },
  { value: "14", label: "Dourado 3" },
  { value: "15", label: "Dourado 4" },
];

export function AdicionarMissaoForm({
  modalityOptions,
}: {
  modalityOptions: { code: string; name: string }[];
}) {
  const [state, formAction] = useFormState(createMission, null);

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
          <label className="block text-sm font-medium text-text-secondary mb-1">Faixa (cor)</label>
          <select name="beltIndex" className="input w-full">
            {BELT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
