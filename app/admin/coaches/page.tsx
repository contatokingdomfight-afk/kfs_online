import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

export default async function AdminCoachesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: coaches } = await supabase
    .from("Coach")
    .select("id, userId, specialties, createdAt")
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
                <Link
                  href={`/admin/coaches/${c.id}`}
                  className="card"
                  style={{
                    display: "block",
                    padding: "clamp(14px, 3.5vw, 18px)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {u?.name || "—"}
                  </span>
                  <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {u?.email ?? "—"}
                  </p>
                  {c.specialties && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                      {c.specialties}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
