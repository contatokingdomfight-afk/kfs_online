import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  marketing_optin: boolean;
  source: string | null;
  created_at: string;
};

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d);
  m.setDate(diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function startOfMonth(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  return m;
}

export default async function AdminLeadsPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: rows } = await supabase
    .from("waitlist")
    .select("id, name, email, phone, city, marketing_optin, source, created_at")
    .order("created_at", { ascending: false });

  const list: Row[] = rows ?? [];
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const thisWeek = list.filter((r) => new Date(r.created_at) >= weekStart).length;
  const thisMonth = list.filter((r) => new Date(r.created_at) >= monthStart).length;
  const withOptIn = list.filter((r) => r.marketing_optin).length;

  const bySource: Record<string, number> = {};
  list.forEach((r) => {
    const s = r.source?.trim() || "—";
    bySource[s] = (bySource[s] ?? 0) + 1;
  });

  const byCity: Record<string, number> = {};
  list.forEach((r) => {
    const c = r.city?.trim() || "—";
    byCity[c] = (byCity[c] ?? 0) + 1;
  });

  const latest = list.slice(0, 30);

  return (
    <div style={{ maxWidth: "min(900px, 100%)", display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <Link
          href="/admin"
          style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}
        >
          ← Admin
        </Link>
        <span style={{ color: "var(--text-secondary)" }}>|</span>
        <h1 style={{ margin: 0, fontSize: "clamp(1.25rem, 4vw, 1.5rem)", fontWeight: 700, color: "var(--text-primary)" }}>
          Leads (lista de espera)
        </h1>
      </div>

      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
        Dados da landing <strong>/lista_espera</strong>. Origem: Instagram Ads e outros.
      </p>

      {/* KPIs */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        <div className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Total de leads</div>
          <div style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--text-primary)" }}>{list.length}</div>
        </div>
        <div className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Esta semana</div>
          <div style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--primary)" }}>{thisWeek}</div>
        </div>
        <div className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Este mês</div>
          <div style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--primary)" }}>{thisMonth}</div>
        </div>
        <div className="card" style={{ padding: "clamp(12px, 3vw, 18px)", minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Com opt-in marketing</div>
          <div style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--success)" }}>{withOptIn}</div>
        </div>
      </section>

      {/* Por origem e por cidade */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Por origem</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            {Object.entries(bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => (
                <li key={source}>
                  <strong style={{ color: "var(--text-primary)" }}>{source}</strong>: {count}
                </li>
              ))}
            {Object.keys(bySource).length === 0 && <li>—</li>}
          </ul>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Por cidade</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            {Object.entries(byCity)
              .sort((a, b) => b[1] - a[1])
              .map(([city, count]) => (
                <li key={city}>
                  <strong style={{ color: "var(--text-primary)" }}>{city}</strong>: {count}
                </li>
              ))}
            {Object.keys(byCity).length === 0 && <li>—</li>}
          </ul>
        </div>
      </div>

      {/* Tabela últimos leads */}
      <div className="card" style={{ padding: 16, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Últimos leads</h3>
        {latest.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Ainda não há inscrições na lista de espera.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 500 }}>Data</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 500 }}>Nome</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 500 }}>Email</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 500 }}>Cidade</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 500 }}>Origem</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-secondary)", fontWeight: 500 }}>Marketing</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>
                    {new Date(r.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{r.name ?? "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{r.email ?? "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{r.city ?? "—"}</td>
                  <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{r.source ?? "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{r.marketing_optin ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
