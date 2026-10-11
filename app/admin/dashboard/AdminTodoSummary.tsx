import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CheckCircle2, ChevronRight, MessageCircle } from "lucide-react";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { loadAdminTodo } from "@/lib/admin-todo";
import { TONE_COLOR, todoIcon } from "../a-tratar/todo-ui";

const TONE_BG: Record<string, string> = { red: "rgba(248,113,113,0.16)", amber: "rgba(251,191,36,0.16)", blue: "rgba(96,165,250,0.16)" };

/** «A tratar hoje» no topo do painel: alertas com algo pendente + os primeiros em risco de sair. */
export async function AdminTodoSummary({ client, schoolId }: { client: SupabaseClient; schoolId: string | null }) {
  const groups = await loadAdminTodo(client, schoolId);
  const pending = groups.filter((g) => g.items.length > 0);
  const total = pending.reduce((acc, g) => acc + g.items.length, 0);
  const risco = groups.find((g) => g.kind === "risco");
  const qs = (tipo: string) => `/admin/a-tratar?tipo=${tipo}${schoolId ? `&school=${encodeURIComponent(schoolId)}` : ""}`;

  if (pending.length === 0) {
    return (
      <section className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <CheckCircle2 size={24} color={TONE_COLOR.green} aria-hidden />
        <span>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>Tudo em dia</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>Não há pagamentos, adesões nem alunos em risco para tratar.</span>
        </span>
      </section>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
      <section aria-labelledby="atratar-t" className="card" style={{ flex: "999 1 480px", minWidth: 0, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <h2 id="atratar-t" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>A tratar hoje</h2>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
            {total} {total === 1 ? "pendente" : "pendentes"} · por urgência
          </span>
        </div>
        {pending.map((g, i) => (
          <div key={g.kind} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
            <span aria-hidden style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: TONE_BG[g.tone], color: TONE_COLOR[g.tone], display: "flex", alignItems: "center", justifyContent: "center" }}>
              {todoIcon(g.kind)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 800 }}>
                {g.items.length} · {g.title}
                <InlineInfoTip trigger="click" detail={g.info} ariaLabel={g.title} />
              </span>
              <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>{g.summary}</span>
            </span>
            <Link href={qs(g.kind)} style={{ minHeight: 38, padding: "0 14px", borderRadius: 10, border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 800, textDecoration: "none", color: "var(--text-primary)", flexShrink: 0 }}>
              Tratar
              <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
        ))}
      </section>

      {risco && risco.items.length > 0 ? (
        <section aria-labelledby="risco-t" className="card" style={{ flex: "1 1 300px", minWidth: 0, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h2 id="risco-t" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Em risco de sair</h2>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>último treino</span>
          </div>
          {risco.items.slice(0, 4).map((it) => (
            <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>{it.cells[0]?.text}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: it.cells[1]?.tone ? TONE_COLOR[it.cells[1].tone] : "var(--text-secondary)", whiteSpace: "nowrap" }}>{it.cells[1]?.text}</span>
              {it.whatsappUrl ? (
                <a href={it.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${it.name}`} style={{ width: 36, height: 36, borderRadius: 18, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)", flexShrink: 0 }}>
                  <MessageCircle size={16} aria-hidden />
                </a>
              ) : null}
            </div>
          ))}
          <Link href={qs("risco")} style={{ minHeight: 40, borderRadius: 12, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, textDecoration: "none", color: "var(--text-primary)" }}>
            Ver os {risco.items.length}
          </Link>
        </section>
      ) : null}
    </div>
  );
}
