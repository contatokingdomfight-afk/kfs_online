import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CoachActiveToggle } from "./CoachActiveToggle";

export const dynamic = "force-dynamic";

export default async function AdminCoachesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  // Preferir admin client (bypassa RLS); fallback para createClient quando service role não configurada
  const adminResult = getAdminClientOrNull();
  const supabase = adminResult.client ?? (await createClient());

  const { data: coaches } = await supabase
    .from("Coach")
    .select("id, userId, specialties, createdAt, is_active")
    .order("createdAt", { ascending: false });

  const list = coaches ?? [];
  const userIds = list.map((c) => c.userId);
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Coaches
        </h1>
        <Link
          href="/admin/coaches/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Novo coach
        </Link>
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Ainda não há coaches cadastrados.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(10px, 2.5vw, 12px)",
          }}
        >
          {list.map((c) => {
            const u = userById.get(c.userId);
            return (
              <li key={c.id}>
                <div
                  className="card"
                  style={{
                    padding: "clamp(14px, 3.5vw, 18px)",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "clamp(10px, 2.5vw, 12px)",
                  }}
                >
                  <Link
                    href={`/admin/coaches/${c.id}`}
                    style={{
                      flex: "1 1 auto",
                      minWidth: 0,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {u?.name || "—"}
                    </span>
                    {!(c as { is_active?: boolean }).is_active && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--text-secondary)",
                          color: "var(--bg)",
                        }}
                      >
                        Inativo
                      </span>
                    )}
                    <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      {u?.email ?? "—"}
                    </p>
                    {c.specialties && (
                      <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                        {c.specialties}
                      </p>
                    )}
                  </Link>
                  <CoachActiveToggle coachId={c.id} isActive={(c as { is_active?: boolean }).is_active !== false} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
