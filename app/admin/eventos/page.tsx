import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";

const TYPE_LABELS: Record<string, string> = {
  CAMP: "Camp",
  WORKSHOP: "Workshop",
};

function formatEventDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function AdminEventosPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const { data: events } = await supabase
    .from("Event")
    .select("id, name, description, type, event_date, price, max_participants, is_active")
    .order("event_date", { ascending: false });

  const list = events ?? [];

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
          Eventos
        </h1>
        <Link
          href="/admin/eventos/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Novo evento
        </Link>
      </div>

      <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Camps e Workshops com data e preço. Os alunos podem inscrever-se na área &quot;Cursos e Eventos&quot;.
      </p>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Ainda não há eventos. Crie o primeiro em &quot;Novo evento&quot;.
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
          {list.map((e) => (
            <li key={e.id}>
              <Link
                href={`/admin/eventos/${e.id}`}
                className="card"
                style={{
                  display: "block",
                  padding: "clamp(14px, 3.5vw, 18px)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {e.name}
                  </span>
                  {!e.is_active && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 6px",
                        background: "var(--text-secondary)",
                        color: "var(--bg)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      Inativo
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "clamp(12px, 3vw, 14px)",
                      padding: "2px 8px",
                      background: "var(--surface)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {TYPE_LABELS[e.type] ?? e.type}
                  </span>
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {formatEventDate(e.event_date)}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--primary)" }}>
                    €{Number(e.price).toFixed(0)}
                  </span>
                </div>
                {e.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {e.description.slice(0, 100)}
                    {e.description.length > 100 ? "…" : ""}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
