import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getTranslations } from "@/lib/i18n";

type Props = { locale: "pt" | "en" };

/**
 * Sino com contador de não lidas; link para a central de notificações.
 */
export async function NotificationBell({ locale }: Props) {
  const studentId = await getCurrentStudentId();
  if (!studentId) return null;

  const supabase = await createClient();
  const { count } = await supabase
    .from("Notification")
    .select("*", { count: "exact", head: true })
    .eq("studentId", studentId)
    .is("read_at", null);

  const t = getTranslations(locale);
  const n = count ?? 0;
  const label = n > 99 ? "99+" : String(n);

  return (
    <Link
      href="/dashboard/notificacoes"
      aria-label={t("notificationsCenterAria")}
      title={t("navNotificationsCenter")}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "clamp(44px, 11vw, 48px)",
        minHeight: "clamp(44px, 11vw, 48px)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        backgroundColor: "var(--bg)",
        color: "var(--text-primary)",
        flexShrink: 0,
        textDecoration: "none",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 22, height: 22 }} aria-hidden>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {n > 0 && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            backgroundColor: "var(--primary)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          {label}
        </span>
      )}
    </Link>
  );
}
