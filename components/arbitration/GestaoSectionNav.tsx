"use client";

type SectionId = "eventos" | "combates" | "criterios" | "juizes";

export const GESTAO_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "eventos", label: "Eventos" },
  { id: "combates", label: "Combates" },
  { id: "criterios", label: "Critérios" },
  { id: "juizes", label: "Juízes" },
];

export type GestaoSectionId = SectionId;

const SECTION_IDS = new Set<string>(GESTAO_SECTIONS.map((s) => s.id));

export function parseGestaoSection(value: string | null): GestaoSectionId {
  if (value && SECTION_IDS.has(value)) return value as GestaoSectionId;
  return "eventos";
}

type Props = {
  active: GestaoSectionId;
  onChange: (id: GestaoSectionId) => void;
};

export function GestaoSectionNav({ active, onChange }: Props) {
  return (
    <nav className="arb-gestao-tabs" aria-label="Secções da gestão">
      {GESTAO_SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? "arb-gestao-tab arb-gestao-tab-active" : "arb-gestao-tab"}
            onClick={() => onChange(section.id)}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
