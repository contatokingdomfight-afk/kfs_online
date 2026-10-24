import Link from "next/link";
import type { ReactNode } from "react";
import { AcceptTrialButton } from "@/app/admin/experimentais/AcceptTrialButton";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { loadAdminTodo, type AdminTodoGroup, type AdminTodoItem } from "@/lib/admin-todo";
import { ADMIN_TODO_ORDER, type AdminTodoKind } from "@/lib/admin-todo-rules";
import { BulkTodoButton, TodoActionButton, WhatsAppSequence } from "./TodoButtons";
import { confirmOrderPayment } from "@/app/admin/loja/encomendas/actions";
import { TONE_COLOR, todoIcon } from "./todo-ui";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = { done: "feito", contactado: "contactado", lembrete: "lembrete enviado", pedido: "avaliação pedida", "parabéns": "parabéns enviados", "coaches avisados": "coaches avisados" };
const KIND_TITLE: Record<AdminTodoKind, string> = {
  pagamentos: "Pagamentos",
  seguros: "Seguro / matrícula",
  encomendas: "Encomenda",
  vencer: "Mensalidade a vencer",
  semana: "Kingdom Week",
  semplano: "Sem plano",
  exame: "Apto para exame",
  aniversarios: "Aniversário",
  risco: "Risco de sair",
  carga: "Carga alta",
  adesao: "Adesão",
  fisicas: "Avaliação física",
  performance: "Performance por avaliar",
  confirmar: "Confirmação de experimental",
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
  if (item.kind === "encomendas" && item.orderId)
    primary = (
      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
        {waLink}
        <form action={confirmOrderPayment} style={{ display: "inline-flex", gap: 6 }}>
          <input type="hidden" name="orderId" value={item.orderId} />
          <select name="paymentMethod" defaultValue="TRANSFER" aria-label="Forma de pagamento" className="input" style={{ minHeight: 36, width: "auto", fontSize: 13 }}>
            <option value="TRANSFER">Transferência / Revolut</option>
            <option value="MBWAY">MBWay</option>
            <option value="CASH">Dinheiro</option>
            <option value="DEPOSIT">Depósito</option>
          </select>
          <button type="submit" style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", fontSize: 13, fontWeight: 800, color: "var(--text-primary)", cursor: "pointer", whiteSpace: "nowrap" }}>
            Recebido
          </button>
        </form>
      </span>
    );
  if (item.kind === "confirmar")
    primary = (
      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
        {!item.accepted && item.trialId ? <AcceptTrialButton trialId={item.trialId} /> : null}
        {waLink}
      </span>
    );
  if (item.kind === "adesao") primary = <TodoActionButton action="remind" item={fields} label="Lembrar" variant="primary" />;
  if (item.kind === "fisicas")
    primary = item.requested ? (
      <span style={{ fontSize: 13, color: TONE_COLOR.green, fontWeight: 700 }}>Pedido feito</span>
    ) : (
      <TodoActionButton action="request" item={fields} label="Pedir avaliação" variant="primary" />
    );
  if (item.kind === "exame" && item.href)
    primary = (
      <Link href={item.href} style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 800, textDecoration: "none", color: "var(--text-primary)" }}>
        Convocar
      </Link>
    );
  if (item.kind === "performance" && item.href)
    primary = (
      <Link href={item.href} style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 800, textDecoration: "none", color: "var(--text-primary)" }}>
        Avaliar
      </Link>
    );
  if (item.kind === "carga" && item.href)
    primary = (
      <Link href={item.href} style={{ minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 800, textDecoration: "none", color: "var(--text-primary)" }}>
        Ver carga
      </Link>
    );

  return (
    <span className="todo-actions">
      {item.kind === "adesao" ? waLink : null}
      {primary}
      <TodoActionButton
        action="done"
        item={fields}
        label={item.kind === "confirmar" ? "Confirmado" : "Feito"}
        doneAction={item.kind === "confirmar" ? "confirmado" : item.kind === "risco" || item.kind === "experimentais" || item.kind === "semplano" || item.kind === "semana" ? "contactado" : item.kind === "aniversarios" ? "parabéns" : "done"}
      />
    </span>
  );
}

/** Ação em lote do alerta (no cabeçalho). */
function BulkControl({ g, schoolId }: { g: AdminTodoGroup; schoolId: string | null }) {
  if (g.items.length === 0) return null;
  if (g.kind === "pagamentos" || g.kind === "seguros" || g.kind === "encomendas" || g.kind === "vencer" || g.kind === "semana" || g.kind === "risco" || g.kind === "semplano" || g.kind === "confirmar" || g.kind === "experimentais" || g.kind === "aniversarios") {
    const withPhone = g.items.filter((it) => it.whatsappUrl);
    const missing = g.items.length - withPhone.length;
    return (
      <span className="todo-bulk-stack">
        <WhatsAppSequence
          items={withPhone.map((it) => ({ kind: it.kind, doneKey: it.key, studentId: it.studentId, label: it.name, url: it.whatsappUrl! }))}
          doneAction={g.kind === "pagamentos" || g.kind === "seguros" || g.kind === "encomendas" || g.kind === "vencer" ? "lembrete" : g.kind === "aniversarios" ? "parabéns" : g.kind === "confirmar" ? "confirmado" : "contactado"}
        />
        {missing > 0 ? <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{missing} sem telefone</span> : null}
      </span>
    );
  }
  if (g.kind === "adesao") {
    return <BulkTodoButton kind="adesao" schoolId={schoolId} label="Lembrar todos" confirmLabel={`Enviar lembrete no sino a ${g.items.length}?`} />;
  }
  if (g.kind === "fisicas") {
    const n = g.items.filter((it) => !it.requested).length;
    if (n === 0) return null;
    return <BulkTodoButton kind="fisicas" schoolId={schoolId} label="Pedir a todos" confirmLabel={`Pedir avaliação física a ${n}?`} />;
  }
  if (g.kind !== "carga") return null;
  return <BulkTodoButton kind="carga" schoolId={schoolId} label="Avisar os coaches" confirmLabel={`Avisar os coaches de ${g.items.length} ${g.items.length === 1 ? "aluno" : "alunos"}?`} />;
}

function GroupTable({ g }: { g: AdminTodoGroup }) {
  const cols = `minmax(170px, 1.6fr) ${g.columns.slice(1, -1).map(() => "minmax(0, 1fr)").join(" ")} minmax(200px, auto)`;
  const vars = { "--todo-cols": cols } as React.CSSProperties;
  return (
    <div>
      <div className="todo-thead" style={{ ...vars, padding: "10px 18px", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
        {g.columns.map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
      {g.items.map((it) => (
        <div key={it.key} className="todo-tr" style={{ ...vars, padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          {it.href && it.studentId ? (
            <Link href={it.href} style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", textDecoration: "none", overflowWrap: "anywhere" }}>
              {it.name}
            </Link>
          ) : (
            <span style={{ fontSize: 15, fontWeight: 800, overflowWrap: "anywhere" }}>{it.name}</span>
          )}
          {it.cells.map((c, i) => (
            <span key={i} className="todo-cell" style={{ fontSize: 13 }}>
              <span className="todo-cell-label">{g.columns[i + 1]}:</span>
              <span style={{ fontWeight: c.tone ? 800 : 400, color: c.tone ? TONE_COLOR[c.tone] : "var(--text-secondary)" }}>{c.text}</span>
            </span>
          ))}
          <ItemActions item={it} />
        </div>
      ))}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0, paddingBottom: 96 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/admin/dashboard" aria-label="Voltar ao painel" style={{ width: 40, height: 40, borderRadius: 20, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }}>
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <div>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Painel</span>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 26px)", fontWeight: 800 }}>A tratar hoje</h1>
        </div>
      </header>

      <div className="todo-layout">
        <nav aria-label="Alertas" className="todo-nav">
          {groups.map((g) => {
            const active = g.kind === current.kind;
            const empty = g.items.length === 0;
            return (
              <Link
                key={g.kind}
                href={qs(g.kind)}
                aria-current={active ? "page" : undefined}
                className="todo-nav-link"
                style={{ padding: "0 14px", borderRadius: 14, border: active ? `2px solid ${TONE_COLOR[g.tone]}` : "1px solid var(--border)", background: active ? "var(--bg-secondary)" : "transparent", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, textDecoration: "none", fontSize: 14, fontWeight: 700, opacity: empty ? 0.55 : 1 }}
              >
                <span aria-hidden style={{ color: empty ? TONE_COLOR.green : TONE_COLOR[g.tone], display: "inline-flex" }}>
                  {todoIcon(g.kind, 18)}
                </span>
                <span className="todo-nav-title">{g.title}</span>
                <span style={{ minWidth: 26, height: 26, borderRadius: 13, background: "var(--bg)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", color: empty ? TONE_COLOR.green : "var(--text-primary)" }}>
                  {g.items.length}
                </span>
              </Link>
            );
          })}
        </nav>

        <section aria-labelledby="todo-title" className="card todo-main" style={{ padding: 0, overflow: "hidden" }}>
          <div className="todo-head" style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
            <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, background: current.items.length ? TONE_COLOR[current.tone] : TONE_COLOR.green, color: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, flexShrink: 0 }}>
              {current.items.length}
            </span>
            <div className="todo-head-text">
              <h2 id="todo-title" style={{ margin: 0, fontSize: 19, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                {current.title}
                <InlineInfoTip trigger="click" detail={current.info} ariaLabel={current.title} />
              </h2>
              {current.summary ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{current.summary}</span> : null}
            </div>
            <div className="todo-head-bulk">
              <BulkControl key={current.kind} g={current} schoolId={schoolId} />
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
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
            {historyRows.map((h, i) => (
              <li key={i} className="todo-hist-row" style={{ fontSize: 13, color: "var(--text-secondary)", padding: "6px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 700, overflowWrap: "anywhere" }}>{h.label ?? "—"}</span>
                <span style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  {new Date(h.doneAt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ gridColumn: "1 / -1" }}>
                  {KIND_TITLE[h.kind] ?? h.kind} · {ACTION_LABEL[h.action ?? "done"] ?? h.action}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
