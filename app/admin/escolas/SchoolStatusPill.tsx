import { SCHOOL_STATUS_LABEL, type SchoolStatus } from "@/lib/school-status";

const COLOR: Record<SchoolStatus, string> = {
  ATIVA: "var(--success)",
  PREPARACAO: "var(--warning)",
  DESATIVADA: "var(--text-secondary)",
};

export function SchoolStatusPill({ status }: { status: SchoolStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        padding: "2px 10px",
        borderRadius: "var(--radius-full)",
        border: `1px solid ${COLOR[status]}`,
        color: COLOR[status],
        whiteSpace: "nowrap",
      }}
    >
      {SCHOOL_STATUS_LABEL[status]}
    </span>
  );
}
