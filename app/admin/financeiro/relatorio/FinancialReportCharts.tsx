"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { FinancialReportHistoryPoint } from "@/lib/admin-financial-report";

type Props = {
  history: FinancialReportHistoryPoint[];
};

export function FinancialReportCharts({ history }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = history.map((h) => ({
    ...h,
    label: `${h.month.slice(5)}/${h.month.slice(2, 4)}`,
  }));

  if (!mounted) {
    return <section className="card" style={{ padding: 16, minHeight: 280 }} />;
  }

  return (
    <section className="card" style={{ padding: 16, minWidth: 0, overflow: "hidden" }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Receitas vs despesas (6 meses)</h2>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #333)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => (typeof v === "number" ? `${v.toFixed(2)} €` : "")} />
            <Legend />
            <Bar dataKey="revenue" name="Receitas" fill="#22c55e" />
            <Bar dataKey="expenses" name="Despesas" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
