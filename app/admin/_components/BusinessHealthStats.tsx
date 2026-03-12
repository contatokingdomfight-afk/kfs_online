import Link from "next/link";

type Props = {
  revenueCurrentMonth: number;
  activeStudents: number;
  newStudentsThisMonth: number;
  avgAttendanceLast7Days: number;
  labels: {
    revenueThisMonth: string;
    activeStudents: string;
    newStudentsMonth: string;
    avgAttendanceDaily: string;
  };
};

export function BusinessHealthStats({
  revenueCurrentMonth,
  activeStudents,
  newStudentsThisMonth,
  avgAttendanceLast7Days,
  labels,
}: Props) {
  const cards = [
    {
      href: "/admin/financeiro",
      icon: "💰",
      value: `${Number(revenueCurrentMonth).toFixed(0)} €`,
      label: labels.revenueThisMonth,
    },
    {
      href: "/admin/alunos",
      icon: "👥",
      value: String(activeStudents),
      label: labels.activeStudents,
    },
    {
      href: "/admin/alunos?newThisMonth=1",
      icon: "✨",
      value: String(newStudentsThisMonth),
      label: labels.newStudentsMonth,
    },
    {
      href: "/admin/presenca",
      icon: "📊",
      value: avgAttendanceLast7Days.toFixed(1),
      label: labels.avgAttendanceDaily,
    },
  ];

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "clamp(10px, 2.5vw, 16px)",
      }}
    >
      {cards.map((c) => (
        <Link
          key={c.href + c.label}
          href={c.href}
          className="card"
          style={{
            padding: "clamp(14px, 3.5vw, 20px)",
            minWidth: 0,
            textDecoration: "none",
            color: "inherit",
            display: "block",
          }}
        >
          <span style={{ fontSize: 24, marginBottom: 8, display: "block" }} aria-hidden>
            {c.icon}
          </span>
          <div style={{ fontSize: "clamp(18px, 4.5vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>
            {c.value}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{c.label}</div>
        </Link>
      ))}
    </section>
  );
}
