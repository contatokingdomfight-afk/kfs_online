"use client";

type Props = {
  options: string[];
  selected: string | null;
  onSelect: (main: string | null) => void;
  allLabel?: string;
};

/** Filtro horizontal por categorias principais (rótulos 100% derivados dos dados). */
export function CriteriaMainCategoryChips({
  options,
  selected,
  onSelect,
  allLabel = "Todas",
}: Props) {
  if (options.length === 0) return null;

  return (
    <div className="mb-4 -mx-1">
      <div
        className="flex gap-2 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] px-1"
        role="tablist"
        aria-label="Filtrar por categoria"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selected === null}
          onClick={() => onSelect(null)}
          className={`snap-start shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border ${
            selected === null
              ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
              : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border)]/80 hover:border-[var(--primary)]/50 hover:bg-[var(--border)]/20"
          }`}
        >
          {allLabel}
        </button>
        {options.map((main) => {
          const active = selected === main;
          return (
            <button
              key={main}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(main)}
              className={`snap-start shrink-0 max-w-[min(85vw,280px)] truncate rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border ${
                active
                  ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                  : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border)]/80 hover:border-[var(--primary)]/50 hover:bg-[var(--border)]/20"
              }`}
              title={main}
            >
              {main}
            </button>
          );
        })}
      </div>
    </div>
  );
}
