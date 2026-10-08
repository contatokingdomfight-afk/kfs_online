import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getFamilyHubForStudent } from "@/lib/family-group";

const AVATAR_COLORS = ["#3b82f6", "#a855f7", "#14b8a6", "#f59e0b", "#ec4899", "#64748b"];

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default async function FamiliaHubPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/dashboard");

  const supabase = await createClient();
  const hub = await getFamilyHubForStudent(supabase, studentId);
  if (!hub) redirect("/dashboard");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      <section className="card" style={{ padding: "clamp(16px, 4vw, 22px)", display: "flex", alignItems: "center", gap: 14 }}>
        <span
          aria-hidden
          style={{
            width: 52,
            height: 52,
            flexShrink: 0,
            borderRadius: 14,
            backgroundColor: "var(--primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Users size={26} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800 }}>
            {hub.groupName?.trim() || "Grupo familiar"}
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            {hub.members.length} {hub.members.length === 1 ? "membro" : "membros"} · plano família
          </p>
        </div>
      </section>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {hub.members.map((m, i) => (
          <li
            key={m.studentId}
            className="card"
            style={{
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderColor: m.isSelf ? "var(--primary)" : undefined,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: "50%",
                backgroundColor: m.isSelf ? "var(--primary)" : AVATAR_COLORS[i % AVATAR_COLORS.length],
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initialsOf(m.name)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, color: "var(--text-primary)" }}>
                {m.name}
                {m.isSelf ? " (tu)" : ""}
              </span>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                color: m.role === "TITULAR" ? "var(--primary)" : "var(--text-secondary)",
              }}
            >
              {m.role === "TITULAR" ? "Titular" : "Membro"}
            </span>
          </li>
        ))}
      </ul>

      {hub.isTitular && (
        <Link
          href="/dashboard/financeiro"
          className="card"
          style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}
        >
          <span style={{ flex: 1, fontSize: 14 }}>
            Como titular, a mensalidade do grupo aparece em <strong>Plano e pagamentos</strong>.
          </span>
          <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
        </Link>
      )}
    </div>
  );
}
