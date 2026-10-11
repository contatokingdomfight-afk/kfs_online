"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type ModalityOption = { code: string; name: string };

type Props = {
  currentPeriod: string;
  currentModality: string | null;
  modalities: ModalityOption[];
  labels: {
    periodLabel: string;
    modalityLabel: string;
    allModalities: string;
    days7: string;
    days15: string;
    days30: string;
    months1: string;
    months3: string;
    months6: string;
    months12: string;
  };
};

/** Períodos mostrados como botões; 15 dias e 1 mês só aparecem se vierem no endereço (compatibilidade). */
const PERIOD_OPTIONS = (labels: Props["labels"]) => [
  { value: "7d", label: labels.days7 },
  { value: "15d", label: labels.days15, hidden: true },
  { value: "30d", label: labels.days30 },
  { value: "1m", label: labels.months1, hidden: true },
  { value: "3m", label: labels.months3 },
  { value: "6m", label: labels.months6 },
  { value: "12m", label: labels.months12 },
];

function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: "0 0 auto",
        minHeight: 36,
        padding: "0 14px",
        borderRadius: 999,
        border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: active ? "var(--primary)" : "var(--bg-secondary)",
        color: active ? "#fff" : "var(--text-primary)",
        font: "inherit",
        fontSize: 13,
        fontWeight: active ? 800 : 600,
        cursor: disabled ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, overflowX: "auto", scrollbarWidth: "none", maxWidth: "100%" };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)", flex: "0 0 auto", marginRight: 4 };

/** Filtros dos relatórios: período e modalidade como botões (deslizam no telemóvel). */
export function AdminDashboardPeriodFilter({ currentPeriod, currentModality, modalities, labels }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(key: "period" | "modality", value: string | null) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`, { scroll: false }));
  }

  const periods = PERIOD_OPTIONS(labels).filter((p) => !p.hidden || p.value === currentPeriod);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, opacity: pending ? 0.6 : 1, transition: "opacity 0.15s" }} aria-busy={pending}>
      <div role="group" aria-label={labels.periodLabel} className="swipe-carousel-scroll" style={rowStyle}>
        <span style={labelStyle}>{labels.periodLabel}</span>
        {periods.map((p) => (
          <Chip key={p.value} active={p.value === currentPeriod} onClick={() => go("period", p.value)} disabled={pending}>
            {p.label}
          </Chip>
        ))}
      </div>
      {modalities.length > 1 ? (
        <div role="group" aria-label={labels.modalityLabel} className="swipe-carousel-scroll" style={rowStyle}>
          <span style={labelStyle}>{labels.modalityLabel}</span>
          <Chip active={!currentModality} onClick={() => go("modality", null)} disabled={pending}>
            {labels.allModalities}
          </Chip>
          {modalities.map((m) => (
            <Chip key={m.code} active={currentModality === m.code} onClick={() => go("modality", m.code)} disabled={pending}>
              {m.name}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
