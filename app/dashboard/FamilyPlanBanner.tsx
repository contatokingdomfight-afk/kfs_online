import Link from "next/link";
import type { FamilyStudentBanner } from "@/lib/family-group";

type Props = {
  banner: FamilyStudentBanner;
  locale: "pt" | "en";
  titularMessage: string;
  memberMessage: string;
  membersCountLabel: string;
  adminHint: string;
  financeiroLabel: string;
};

export function FamilyPlanBanner({
  banner,
  locale,
  titularMessage,
  memberMessage,
  membersCountLabel,
  adminHint,
  financeiroLabel,
}: Props) {
  const countText = membersCountLabel
    .replace("{count}", String(banner.memberCount))
    .replace("{max}", String(banner.maxMembers));

  const roleMessage = banner.isTitular
    ? titularMessage
    : memberMessage.replace("{titular}", banner.titularName);

  const groupLabel = banner.groupName?.trim() || (locale === "en" ? "Family group" : "Grupo familiar");

  return (
    <div
      className="card"
      role="status"
      style={{
        padding: "clamp(14px, 3.5vw, 18px)",
        borderLeft: "4px solid var(--primary)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px 12px" }}>
        <span style={{ fontWeight: 700, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)" }}>
          {groupLabel}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: 999,
            backgroundColor: "var(--bg)",
            color: "var(--text-secondary)",
          }}
        >
          {countText}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", lineHeight: 1.45 }}>
        {roleMessage}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
        {adminHint}
      </p>
      {banner.isTitular && (
        <Link
          href="/dashboard/financeiro"
          style={{
            alignSelf: "flex-start",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--primary)",
            textDecoration: "none",
          }}
        >
          {financeiroLabel} →
        </Link>
      )}
    </div>
  );
}
