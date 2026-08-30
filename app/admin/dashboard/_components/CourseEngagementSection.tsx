import { BreakdownList } from "../../_components/BreakdownList";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";

type Engagement = {
  unitsCompleted: number;
  coursesCompleted: number;
  studentsWithPaidPurchase: number;
  topCourses: { courseId: string; courseName: string; completions: number }[];
};

type Props = {
  engagement: Engagement;
  labels: {
    title: string;
    titleInfo: string;
    unitsCompleted: string;
    coursesCompleted: string;
    studentsWithPurchase: string;
    topCoursesTitle: string;
    noData: string;
  };
};

export function CourseEngagementSection({ engagement, labels }: Props) {
  const tiles = [
    { icon: "📘", value: engagement.unitsCompleted, label: labels.unitsCompleted },
    { icon: "🏆", value: engagement.coursesCompleted, label: labels.coursesCompleted },
    { icon: "💳", value: engagement.studentsWithPaidPurchase, label: labels.studentsWithPurchase },
  ];

  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0 }}>
      <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {labels.title}
        <InlineInfoTip trigger="click" detail={labels.titleInfo} ariaLabel={labels.title} />
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "clamp(10px, 2.5vw, 16px)",
          marginBottom: 20,
        }}
      >
        {tiles.map((tile) => (
          <div key={tile.label} style={{ padding: "clamp(12px, 3vw, 16px)", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
            <span style={{ fontSize: 22, marginBottom: 6, display: "block" }} aria-hidden>
              {tile.icon}
            </span>
            <div style={{ fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 700, color: "var(--text-primary)" }}>{tile.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{tile.label}</div>
          </div>
        ))}
      </div>
      <BreakdownList
        title={labels.topCoursesTitle}
        noDataLabel={labels.noData}
        rows={engagement.topCourses.map((c) => ({ key: c.courseId, label: c.courseName, count: c.completions }))}
      />
    </section>
  );
}
