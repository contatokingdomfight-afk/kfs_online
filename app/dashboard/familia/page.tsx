import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getFamilyHubForStudent } from "@/lib/family-group";

export default async function FamiliaHubPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/dashboard");

  const supabase = await createClient();
  const hub = await getFamilyHubForStudent(supabase, studentId);
  if (!hub) redirect("/dashboard");

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <Link href="/dashboard" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
        ← Início
      </Link>
      <h1 style={{ margin: "16px 0 4px", fontSize: 22, fontWeight: 600 }}>
        {hub.groupName?.trim() || "Grupo familiar"}
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-secondary)" }}>
        {hub.members.length}/{hub.maxMembers} membros
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {hub.members.map((m) => (
          <li
            key={m.studentId}
            className="card"
            style={{
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderLeft: m.isSelf ? "3px solid var(--primary)" : undefined,
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {m.name}
                {m.isSelf ? " (você)" : ""}
              </span>
            </div>
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
              {m.role === "TITULAR" ? "Titular" : "Membro"}
            </span>
          </li>
        ))}
      </ul>

      {hub.isTitular && (
        <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-secondary)" }}>
          Como titular, a mensalidade do grupo aparece na tua área{" "}
          <Link href="/dashboard/financeiro" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Financeiro
          </Link>
          .
        </p>
      )}
    </div>
  );
}
