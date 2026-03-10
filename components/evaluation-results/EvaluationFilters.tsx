"use client";

type Props = {
  selectedModality: string | null;
  onSelect: (modality: string | null) => void;
  modalities: { value: string | null; label: string }[];
  className?: string;
};

export function EvaluationFilters({
  selectedModality,
  onSelect,
  modalities,
  className = "",
}: Props) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
        Mostrar critérios de
      </p>
      <div className="flex flex-wrap gap-2">
        {modalities.map((m) => (
          <button
            key={m.value ?? "all"}
            type="button"
            onClick={() => onSelect(m.value)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${selectedModality === m.value ? "bg-[var(--primary)] text-white" : "bg-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)]/80"}
            `}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
