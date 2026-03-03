"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";

type SchoolOption = { id: string; name: string };
type ModalityCount = { modalityCode: string; modalityName: string; count: number };
type MonthRevenue = { month: string; revenue: number };
type DayAttendance = { day: number; total: number; byModality: Record<string, number> };

type Props = {
  schools: SchoolOption[];
  currentSchoolId: string | null;
  totalStudents: number;
  studentsByModality: ModalityCount[];
  revenueCurrentMonth: number;
  revenueAccumulatedMonths: MonthRevenue[];
  attendanceByDay: DayAttendance[];
  modalityCodes: string[];
  modalityNames: Record<string, string>;
};

const MODALITY_CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"];

export function AdminDashboardCharts(props: Props) {
  const {
    schools,
    currentSchoolId,
    revenueCurrentMonth,
    revenueAccumulatedMonths,
    attendanceByDay,
    modalityCodes,
    modalityNames,
  } = props;

  const schoolName = currentSchoolId ? schools.find((s) => s.id === currentSchoolId)?.name ?? "Todas" : "Todas";

  const attendanceChartData = attendanceByDay.map((r) => {
    const out: Record<string, number | string> = { day: r.day, total: r.total };
    modalityCodes.forEach((code) => {
      out[modalityNames[code] ?? code] = r.byModality[code] ?? 0;
    });
    return out;
  });

  const revenueChartData = revenueAccumulatedMonths.map((r) => ({
    ...r,
    label: `${r.month.slice(5)}/${r.month.slice(0, 4)}`,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px, 6vw, 32px)" }}>
      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Presenças no mês ({schoolName})
        </h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                formatter={(value: number | undefined) => [value ?? 0, ""]}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Legend />
              <Bar dataKey="total" name="Total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              {modalityCodes.slice(0, 4).map((code, i) => (
                <Bar
                  key={code}
                  dataKey={modalityNames[code] ?? code}
                  name={modalityNames[code] ?? code}
                  fill={MODALITY_CHART_COLORS[i % MODALITY_CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Receita por mês ({schoolName})
        </h3>
        {revenueChartData.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Sem dados de pagamentos.</p>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" tickFormatter={(v) => `${v} €`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                  formatter={(value: number | undefined) => [`${Number(value ?? 0).toFixed(2)} €`, "Receita"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)" }} name="Receita" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
