import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { loadAdminTodo, type AdminTodoGroup, type AdminTodoItem } from "@/lib/admin-todo";
import { ADMIN_TODO_ORDER, type AdminTodoKind } from "@/lib/admin-todo-rules";
import { TodoActionButton } from "./TodoButtons";
import { TONE_COLOR, todoIcon } from "./todo-ui";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = { done: "feito", contactado: "contactado", lembrete: "lembrete enviado", pedido: "avaliação pedida" };
const KIND_TITLE: Record<AdminTodoKind, string> = {
  pagamentos: "Pagamentos",
  risco: "Risco de sair",
  carga: "Carga alta",
  adesao: "Adesão",
  fisicas: "Avaliação física",
  experimentais: "Experimental",
};

function ItemActions({ item }: { item: AdminTodoItem }) {
  const fields = { kind: item.kind, doneKey: item.key, studentId: item.studentId, label: item.name };
  const waLink = item.whatsappUrl ? (
    <a
      href={item.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, textDecoration: "none", color: "var(--text-primary)", whiteSpace: "nowrap" }}
    >
      <MessageCircle size={15} aria-hidden />
      WhatsApp
    </a>
  ) : null;

  let primary: ReactNode = waLink;
  if (item.kind === "adesao") primary = <TodoActionButton action="remind" item={fields} label="Lembrar" variant="primary" />;
  if (item.kind === "fisicas")
    primary = item.requested ? (
      <span style={{ fontSize: 13, color: TONE_COLOR.green, fontWeight: 700 }}>Pedido feito</span>
    ) : (
      <TodoActionButton action="request" item={fields} label="Pedir avaliação" variant="primary" />
    );
  if (item.kind === "carga" && item.href)
    primary = (
      <Link href={item.href} style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 800, textDecoration: "none", color: "var(--text-primary)" }}>
        Ver carga
      </Link>
    );

  return (
    <span style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
      {item.kind === "adesao" ? waLink : null}
      {primary}
      <TodoActionButton action="done" item={fields} label="Feito" doneAction={item.kind === "risco" || item.kind === "experimentais" ? "contactado" : "done"} />
    </span>
  );
}

function GroupTable({ g }: { g: AdminTodoGroup }) {
  const grid = `minmax(170px, 1.6fr) ${g.columns.slice(1, -1).map(() => "minmax(0, 1fr)").join(" ")} minmax(220px, auto)`;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 760 }}>
        <div style={{ display: "grid", gridTemplateColumns: grid, gap: 12, padding: "10px 18px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
          {g.columns.map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </div>
        {g.items.map((it) => (
          <div key={it.key} style={{ display: "grid", gridTemplateColumns: grid, gap: 12, padding: "11px 18px", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            {it.href && it.studentId ? (
              <Link href={it.href} style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.name}
              </Link>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
            )}
            {it.cells.map((c, i) => (
              <span key={i} style={{ fontSize: 13, fontWeight: c.tone ? 800 : 400, color: c.tone ? TONE_COLOR[c.tone] : "var(--text-secondary)" }}>
                {c.text}
              </span>
            ))}
            <ItemActions item={it} />
          </div>
        ))}
      </div>
    </div>
  );
}

type SearchParams = Promise<{ tipo?: string; school?: string }>;

export default async function AdminATratarPage({ searchParams }: { searchParams: SearchParams }) {
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const params = await searchParams;
  const schoolId = params.school?.trim() || null;

  const [groups, { data: history }] = await Promise.all([
    loadAdminTodo(supabase, schoolId),
    supabase.from("AdminTodoDone").select("kind, label, action, doneAt").order("doneAt", { ascending: false }).limit(12),
  ]);
  const requested = ADMIN_TODO_ORDER.includes(params.tipo as AdminTodoKind) ? (params.tipo as AdminTodoKind) : null;
  const current = groups.find((g) => g.kind === requested) ?? groups.find((g) => g.items.length > 0) ?? groups[0];
  const qs = (tipo: string) => `/admin/a-tratar?tipo=${tipo}${schoolId ? `&school=${encodeURIComponent(schoolId)}` : ""}`;
  const historyRows = (history ?? []) as { kind: AdminTodoKind; label: string | null; action: string | null; doneAt: string }[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/admin/dashboard" aria-label="Voltar ao painel" style={{ width: 40, height: 40, borderRadius: 20, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }}>
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <div>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Painel</span>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 26px)", fontWeight: 800 }}>A tratar hoje</h1>
        </div>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <nav aria-label="Alertas" style={{ flex: "1 1 240px", maxWidth: 300, display: "flex", flexDirection: "column", gap: 6 }}>
          {groups.map((g) => {
            const active = g.kind === current.kind;
            const empty = g.items.length === 0;
            return (
              <Link
                key={g.kind}
                href={qs(g.kind)}
                aria-current={active ? "page" : undefined}
                style={{ minHeight: 50, padding: "0 14px", borderRadius: 14, border: active ? `2px solid ${TONE_COLOR[g.tone]}` : "1px solid var(--border)", background: active ? "var(--bg-secondary)" : "transparent", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, textDecoration: "none", fontSize: 14, fontWeight: 700, opacity: empty ? 0.55 : 1 }}
              >
                <span aria-hidden style={{ color: empty ? TONE_COLOR.green : TONE_COLOR[g.tone], display: "inline-flex" }}>
                  {todoIcon(g.kind, 18)}
                </span>
                <span style={{ flex: 1 }}>{g.title}</span>
                <span style={{ minWidth: 26, height: 26, borderRadius: 13, background: "var(--bg)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", color: empty ? TONE_COLOR.green : "var(--text-primary)" }}>
                  {g.items.length}
                </span>
              </Link>
            );
          })}
        </nav>

        <section aria-labelledby="todo-title" className="card" style={{ flex: "999 1 560px", minWidth: 0, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, background: current.items.length ? TONE_COLOR[current.tone] : TONE_COLOR.green, color: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, flexShrink: 0 }}>
              {current.items.length}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 id="todo-title" style={{ margin: 0, fontSize: 19, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                {current.title}
                <InlineInfoTip trigger="click" detail={current.info} ariaLabel={current.title} />
              </h2>
              {current.summary ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{current.summary}</span> : null}
            </div>
          </div>
          {current.items.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>Tudo tratado</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Este alerta sai do painel até haver algo novo.</div>
            </div>
          ) : (
            <GroupTable g={current} />
          )}
        </section>
      </div>

      {historyRows.length > 0 ? (
        <section aria-labelledby="todo-hist" className="card" style={{ padding: 16 }}>
          <h2 id="todo-hist" style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>Tratados recentemente</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {historyRows.map((h, i) => (
              <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{h.label ?? "—"}</span>
                <span>
                  {KIND_TITLE[h.kind] ?? h.kind} · {ACTION_LABEL[h.action ?? "done"] ?? h.action}
                </span>
                <span style={{ marginLeft: "auto" }}>{new Date(h.doneAt).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
