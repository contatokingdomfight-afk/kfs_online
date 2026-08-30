"use client";

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

const PERIOD_OPTIONS = (labels: Props["labels"]) => [
  { value: "7d", label: labels.days7 },
  { value: "15d", label: labels.days15 },
  { value: "30d", label: labels.days30 },
  { value: "1m", label: labels.months1 },
  { value: "3m", label: labels.months3 },
  { value: "6m", label: labels.months6 },
  { value: "12m", label: labels.months12 },
];

export function AdminDashboardPeriodFilter({ currentPeriod, currentModality, modalities, labels }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handlePeriodChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.set("period", value);
    router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
  }

  function handleModalityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) next.set("modality", value);
    else next.delete("modality");
    router.push(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>{labels.periodLabel}:</span>
        <select
          value={currentPeriod}
          onChange={handlePeriodChange}
          className="input"
          style={{ minWidth: 130 }}
          aria-label={labels.periodLabel}
        >
          {PERIOD_OPTIONS(labels).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>{labels.modalityLabel}:</span>
        <select
          value={currentModality ?? ""}
          onChange={handleModalityChange}
          className="input"
          style={{ minWidth: 160, maxWidth: 240 }}
          aria-label={labels.modalityLabel}
        >
          <option value="">{labels.allModalities}</option>
          {modalities.map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
