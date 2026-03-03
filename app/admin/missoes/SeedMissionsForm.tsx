"use client";

import { useFormState } from "react-dom";
import { runSeedMissions, type SeedMissionsResult } from "./actions";

export function SeedMissionsForm() {
  const [state, formAction] = useFormState(runSeedMissions, null as SeedMissionsResult | null);

  return (
    <form action={formAction} className="rounded-xl bg-bg-secondary border border-border p-4 mb-6">
      <h2 className="text-base font-semibold text-text-primary mb-2">Importar missões padrão</h2>
      <p className="text-sm text-text-secondary mb-3">
        Insere as missões do DOCS/MISSOES.md (assiduidade, avaliação, iniciantes, hardcore, mensais, Battle Pass).
        Missões com o mesmo nome já existentes são ignoradas.
      </p>
      {state?.error && (
        <p className="text-sm text-red-500 mb-2" role="alert">
          {state.error}
        </p>
      )}
      {state != null && !state.error && (state.inserted != null || state.skipped != null) && (
        <p className="text-sm text-green-600 dark:text-green-400 mb-2" role="status">
          Inseridas: {state.inserted ?? 0}. Já existiam (ignoradas): {state.skipped ?? 0}.
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        Importar missões padrão
      </button>
    </form>
  );
}
