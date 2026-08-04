"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ADMIN_CHAT_TREE,
  findNodeById,
  type AdminChatNode,
} from "@/lib/admin-chat/tree";
import {
  matchAgainstNodes,
  matchControlCommand,
  matchGlobal,
  extractAvaliarPerformanceName,
} from "@/lib/admin-chat/match";
import { cadastroPresencialFlow, type ChatFlow, type ChatPrompt, type FlowContext } from "@/lib/admin-chat/guided-flows";
import { getSchoolsForChat, searchStudentsForChat } from "@/lib/admin-chat/actions";

type ChatOption = { label: string; value: string };

type ChatMessage = {
  id: string;
  from: "bot" | "user";
  text: string;
  options?: ChatOption[];
  mono?: boolean;
};

type Mode =
  | { kind: "menu"; path: AdminChatNode[] }
  | { kind: "guided"; gen: ChatFlow; awaiting: ChatPrompt }
  | { kind: "student-search"; label: string; onResolved: (studentId: string, name: string) => void }
  | { kind: "matricula-choice" };

const ROOT_OPTIONS: ChatOption[] = ADMIN_CHAT_TREE.map((n) => ({ label: n.label, value: n.id }));
const HOME_VALUE = "__home__";
const BACK_VALUE = "__back__";

function newId(): string {
  return Math.random().toString(36).slice(2);
}

function withNavOptions(options: ChatOption[], canGoBack: boolean): ChatOption[] {
  const extra: ChatOption[] = [];
  if (canGoBack) extra.push({ label: "← Voltar", value: BACK_VALUE });
  extra.push({ label: "🏠 Início", value: HOME_VALUE });
  return [...options, ...extra];
}

function breadcrumb(path: AdminChatNode[]): string {
  return path.map((n) => n.label).join(" > ");
}

export function AdminChatWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: "menu", path: [] });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const schoolsRef = useRef<{ id: string; name: string }[] | null>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const pushBot = useCallback((text: string, options?: ChatOption[], mono?: boolean) => {
    setMessages((prev) => [...prev, { id: newId(), from: "bot", text, options, mono }]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: newId(), from: "user", text }]);
  }, []);

  const resetToRoot = useCallback(() => {
    setMode({ kind: "menu", path: [] });
    pushBot("Voltamos ao início. O que precisas?", withNavOptions(ROOT_OPTIONS, false));
  }, [pushBot]);

  const openGreeting = useCallback(() => {
    setMessages([
      {
        id: newId(),
        from: "bot",
        text:
          "Oi! Sou o assistente do admin. Digita algo como \"cadastro\", \"financeiro\" ou \"avaliar performance do <nome>\" — ou clica numa opção.",
        options: withNavOptions(ROOT_OPTIONS, false),
      },
    ]);
    setMode({ kind: "menu", path: [] });
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (next && messages.length === 0) openGreeting();
      return next;
    });
  }, [messages.length, openGreeting]);

  async function getSchools(): Promise<{ id: string; name: string }[]> {
    if (schoolsRef.current) return schoolsRef.current;
    const schools = await getSchoolsForChat();
    schoolsRef.current = schools;
    return schools;
  }

  const enterNode = useCallback(
    async (node: AdminChatNode, path: AdminChatNode[]) => {
      if (node.children && node.children.length > 0) {
        setMode({ kind: "menu", path });
        pushBot(
          `${breadcrumb(path)} — o que precisas?`,
          withNavOptions(
            node.children.map((c) => ({ label: c.label, value: c.id })),
            path.length > 0
          )
        );
        return;
      }

      const action = node.action;
      if (!action) {
        pushBot("Esse item ainda não tem uma ação ligada.");
        return;
      }

      switch (action.kind) {
        case "navigate": {
          pushBot(`Abrindo "${node.label}"...`);
          router.push(action.href);
          resetToRoot();
          return;
        }
        case "navigate-with-student": {
          setMode({
            kind: "student-search",
            label: action.studentPrompt,
            onResolved: (studentId, name) => {
              const href = action.hrefTemplate.replace("{studentId}", studentId);
              pushBot(`Abrindo "${node.label}" para ${name}...`);
              router.push(href);
              resetToRoot();
            },
          });
          pushBot(action.studentPrompt);
          return;
        }
        case "matricula": {
          setMode({ kind: "matricula-choice" });
          pushBot("A matrícula é o valor global de configuração, ou o lançamento do pagamento de um aluno específico?", [
            { label: "Configurar valor global", value: "config" },
            { label: "Lançar matrícula de um aluno", value: "pagamento" },
          ]);
          return;
        }
        case "avaliar-performance": {
          setMode({
            kind: "student-search",
            label: "Qual aluno?",
            onResolved: (studentId, name) => {
              pushBot(`Abrindo a avaliação de performance de ${name}...`);
              router.push(`/admin/alunos/${studentId}?avaliar=1`);
              resetToRoot();
            },
          });
          pushBot("Qual aluno queres avaliar?");
          return;
        }
        case "guided": {
          if (action.flow !== "cadastro-presencial") {
            pushBot("Esse fluxo ainda não está disponível.");
            return;
          }
          setBusy(true);
          const schools = await getSchools();
          setBusy(false);
          const ctx: FlowContext = { schools };
          const gen = cadastroPresencialFlow(ctx);
          const first = await gen.next();
          if (first.done) return;
          setMode({ kind: "guided", gen, awaiting: first.value });
          renderPrompt(first.value);
          return;
        }
      }
    },
    [pushBot, router, resetToRoot]
  );

  function renderPrompt(prompt: ChatPrompt) {
    const text = prompt.error ? `⚠️ ${prompt.error}\n${prompt.question}` : prompt.question;
    if (prompt.type === "choice") {
      pushBot(text, prompt.options);
    } else {
      pushBot(text);
    }
  }

  async function resolveStudentSearch(query: string, onResolved: (id: string, name: string) => void) {
    setBusy(true);
    const result = await searchStudentsForChat(query);
    setBusy(false);
    if ("error" in result) {
      pushBot(`Não consegui pesquisar: ${result.error}`);
      return;
    }
    if (result.results.length === 0) {
      pushBot("Não encontrei nenhum aluno com esse nome. Tenta escrever de outra forma.");
      return;
    }
    if (result.results.length === 1) {
      const only = result.results[0]!;
      onResolved(only.studentId, only.name);
      return;
    }
    pushBot(
      "Encontrei mais do que um. Qual deles?",
      result.results.map((r) => ({ label: `${r.name} (${r.email})`, value: r.studentId }))
    );
  }

  const handleAnswer = useCallback(
    async (raw: string, isDirectValue: boolean, directLabel?: string) => {
      const value = raw.trim();
      if (!value) return;

      // Comandos de controlo, válidos em qualquer contexto.
      if (value === HOME_VALUE || matchControlCommand(value) === "home" || matchControlCommand(value) === "cancel") {
        resetToRoot();
        return;
      }
      if (value === BACK_VALUE || matchControlCommand(value) === "back") {
        if (mode.kind === "menu" && mode.path.length > 0) {
          const parentPath = mode.path.slice(0, -1);
          if (parentPath.length === 0) {
            resetToRoot();
          } else {
            const parent = parentPath[parentPath.length - 1]!;
            await enterNode(parent, parentPath);
          }
        } else {
          resetToRoot();
        }
        return;
      }

      if (mode.kind === "guided") {
        setBusy(true);
        const next = await mode.gen.next(value);
        setBusy(false);
        if (next.done) {
          const result = next.value;
          if (result.kind === "error") {
            pushBot(`Não consegui concluir: ${result.message}`);
          } else if (result.kind === "credentials") {
            const passwordLine = result.initialPassword ? `\nSenha inicial: ${result.initialPassword}` : "";
            pushBot(
              `Aluno criado com sucesso!\nLogin: ${result.loginEmail}${passwordLine}${
                result.synthetic ? "\n(email interno gerado para menor de idade)" : ""
              }\n\nAnota a senha — não volta a aparecer.`,
              [{ label: "Ir para a ficha do aluno", value: `__nav__/admin/alunos/${result.studentId}` }],
              true
            );
          }
          setMode({ kind: "menu", path: [] });
        } else {
          setMode({ kind: "guided", gen: mode.gen, awaiting: next.value });
          renderPrompt(next.value);
        }
        return;
      }

      if (mode.kind === "student-search") {
        if (isDirectValue) {
          // valor veio de um clique num resultado da lista — já é o studentId.
          mode.onResolved(value, directLabel ?? "aluno");
        } else {
          await resolveStudentSearch(value, mode.onResolved);
        }
        return;
      }

      if (mode.kind === "matricula-choice") {
        if (value === "config") {
          pushBot("Abrindo configurações de matrícula...");
          router.push("/admin/configuracoes");
          resetToRoot();
        } else if (value === "pagamento") {
          setMode({
            kind: "student-search",
            label: "Para qual aluno?",
            onResolved: (studentId, name) => {
              pushBot(`Abrindo primeiro pagamento (com matrícula) para ${name}...`);
              router.push(`/admin/financeiro/primeiro-pagamento?studentId=${studentId}`);
              resetToRoot();
            },
          });
          pushBot("Para qual aluno é a matrícula?");
        } else {
          pushBot("Escolhe uma das opções.");
        }
        return;
      }

      // mode.kind === "menu"
      if (isDirectValue) {
        const currentChildren = mode.path.length > 0 ? mode.path[mode.path.length - 1]!.children ?? [] : ADMIN_CHAT_TREE;
        const node = findNodeById(value, currentChildren) ?? findNodeById(value, ADMIN_CHAT_TREE);
        if (node) await enterNode(node, [...mode.path, node]);
        return;
      }

      // Atalho: "avaliar performance do <nome>" já traz o nome embutido.
      const directName = extractAvaliarPerformanceName(value);
      if (directName) {
        const onResolved = (studentId: string, name: string) => {
          pushBot(`Abrindo a avaliação de performance de ${name}...`);
          router.push(`/admin/alunos/${studentId}?avaliar=1`);
          resetToRoot();
        };
        setMode({ kind: "student-search", label: "aluno", onResolved });
        await resolveStudentSearch(directName, onResolved);
        return;
      }

      const currentNode = mode.path.length > 0 ? mode.path[mode.path.length - 1]! : null;
      const contextMatches = currentNode?.children ? matchAgainstNodes(value, currentNode.children) : [];
      const best = contextMatches[0] ?? matchGlobal(value)[0];

      if (!best) {
        pushBot(
          "Não entendi. Tenta algo como \"cadastro\", \"financeiro\" ou \"avaliar performance do <nome>\".",
          withNavOptions(currentNode?.children?.map((c) => ({ label: c.label, value: c.id })) ?? ROOT_OPTIONS, mode.path.length > 0)
        );
        return;
      }

      await enterNode(best.node, best.path);
    },
    [mode, enterNode, pushBot, resetToRoot, router]
  );

  const onSend = useCallback(() => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    pushUser(text);
    void handleAnswer(text, false);
  }, [input, busy, pushUser, handleAnswer]);

  const onOptionClick = useCallback(
    (opt: ChatOption) => {
      if (busy) return;
      if (opt.value.startsWith("__nav__")) {
        router.push(opt.value.replace("__nav__", ""));
        return;
      }
      pushUser(opt.label);
      void handleAnswer(opt.value, true, opt.label);
    },
    [busy, pushUser, handleAnswer, router]
  );

  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 200 }}>
      {open && (
        <div
          style={{
            width: "min(360px, calc(100vw - 40px))",
            height: "min(520px, calc(100vh - 120px))",
            marginBottom: 12,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg)",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>Assistente do Admin</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 18, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "88%",
                    padding: "8px 12px",
                    borderRadius: 12,
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    fontFamily: m.mono ? "monospace" : undefined,
                    background: m.from === "user" ? "var(--primary)" : "var(--bg)",
                    color: m.from === "user" ? "#fff" : "var(--text-primary)",
                    border: m.from === "bot" ? "1px solid var(--border)" : "none",
                  }}
                >
                  {m.text}
                </div>
                {m.options && m.options.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, maxWidth: "88%" }}>
                    {m.options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onOptionClick(opt)}
                        className="btn btn-secondary"
                        style={{ fontSize: 13, padding: "6px 10px" }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>A processar...</div>
            )}
          </div>

          <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
            <input
              type="text"
              className="input"
              placeholder="Escreve aqui..."
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={onSend} disabled={busy} className="btn btn-primary" style={{ padding: "8px 14px" }}>
              Enviar
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? "Fechar assistente" : "Abrir assistente do admin"}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "var(--primary)",
          color: "#fff",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "auto",
        }}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
