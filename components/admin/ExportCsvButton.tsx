"use client";

import { exportToCSV } from "@/lib/export-csv";

type Props = {
  rows: Record<string, unknown>[];
  filename: string;
  label?: string;
  disabled?: boolean;
};

export function ExportCsvButton({ rows, filename, label = "Exportar CSV", disabled }: Props) {
  return (
    <button
      type="button"
      className="btn btn-secondary"
      style={{ fontSize: 14 }}
      disabled={disabled || rows.length === 0}
      onClick={() => exportToCSV(rows, filename)}
    >
      {label}
    </button>
  );
}
