"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, MessageCircle } from "lucide-react";
import { quickReceivePayment } from "../actions";
import { FINANCE_PAYMENT_METHODS, type FinancePaymentMethod } from "@/lib/finance-payment-method";
import { buildPaymentReceiptMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export type PorReceberItem = {
  key: string;
  group: "month" | "older" | "fees";
  studentId: string;
  name: string;
  phone: string | null;
  what: string;
  detail: string | null;
  amount: number;
  /** Registo em atraso existente (marca como pago); null = mensalidade do mês ainda sem registo. */
  paymentId: string | null;
  referenceMonth: string | null;
};

const METHOD_SHORT: Record<FinancePaymentMethod, string> = {
  CASH: "Espécie",
  TRANSFER: "Transferência",
  MBWAY: "MBWay",
  DEPOSIT: "Depósito",
};

const GROUP_TITLE: Record<PorReceberItem["group"], string> = {
  month: "Mensalidades do mês",
  older: "Mensalidades de meses anteriores",
  fees: "Seguros e matrículas",
};

const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

type Done = { item: PorReceberItem; amount: number; method: FinancePaymentMethod };

/** Grupos longos (ex.: seguros) mostram as primeiras linhas e «Mostrar todos». */
const COLLAPSE_AFTER = 6;

export function PorReceberList({ items }: { items: PorReceberItem[] }) {
  const [done, setDone] = useState<Done[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const doneKeys = new Set(done.map((d) => d.item.key));
  const visible = items.filter((i) => !doneKeys.has(i.key));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {done.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {done.map((d) => (
            <DoneRow key={d.item.key} done={d} />
          ))}
        </div>
      )}
      {visible.length === 0 ? (
        <p style={{ margin: "8px 0", color: "var(--text-secondary)", fontSize: 15 }}>Está tudo recebido neste mês.</p>
      ) : (
        (["month", "older", "fees"] as const).map((g) => {
          const rows = visible.filter((i) => i.group === g);
          if (!rows.length) return null;
          const collapsible = g !== "month" && rows.length > COLLAPSE_AFTER + 2;
          const shown = collapsible && !expanded[g] ? rows.slice(0, COLLAPSE_AFTER) : rows;
          const groupTotal = rows.reduce((a, r) => a + r.amount, 0);
          return (
            <div key={g} style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.4, padding: "6px 0" }}>
                {GROUP_TITLE[g]} · {rows.length} · {eur(groupTotal)}
              </div>
              {shown.map((it) => (
                <PendingRow key={it.key} item={it} onDone={(amount, method) => setDone((d) => [{ item: it, amount, method }, ...d])} />
              ))}
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [g]: !e[g] }))}
                  style={{ background: "none", border: 0, padding: "10px 0", color: "var(--primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  {expanded[g] ? "Mostrar menos" : `Mostrar todos (${rows.length})`}
                </button>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

function PendingRow({ item, onDone }: { item: PorReceberItem; onDone: (amount: number, method: FinancePaymentMethod) => void }) {
  const [step, setStep] = useState<"idle" | "method">("idle");
  const [custom, setCustom] = useState(false);
  const [amountStr, setAmountStr] = useState(item.amount.toFixed(2).replace(".", ","));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function receive(method: FinancePaymentMethod) {
    const amount = custom ? Number(amountStr.replace(",", ".")) : item.amount;
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Indica um valor válido.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await quickReceivePayment({
        paymentId: item.paymentId,
        studentId: item.studentId,
        referenceMonth: item.referenceMonth,
        amount,
        paymentMethod: method,
      });
      if (res.error) setError(res.error);
      else onDone(amount, method);
    });
  }

  const novoHref = `/admin/financeiro/novo?studentId=${encodeURIComponent(item.studentId)}${item.referenceMonth ? `&referenceMonth=${item.referenceMonth}` : ""}`;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <Link href={`/admin/alunos/${item.studentId}`} style={{ fontWeight: 700, color: "var(--text-primary)", textDecoration: "none" }}>
          {item.name}
        </Link>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {item.what}
          {item.detail ? ` · ${item.detail}` : ""}
        </div>
      </div>
      {custom ? (
        <input
          className="input"
          inputMode="decimal"
          aria-label={`Valor recebido de ${item.name}`}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          style={{ width: 96, minHeight: 38 }}
        />
      ) : (
        <span style={{ fontWeight: 700, minWidth: 70 }}>{eur(item.amount)}</span>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {step === "idle" ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => setStep("method")} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38 }}>
              <Check size={16} aria-hidden /> Recebido
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setCustom(true);
                setStep("method");
              }}
              style={{ minHeight: 38 }}
            >
              Outro valor
            </button>
            {item.group !== "fees" ? (
              <Link href={novoHref} style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Vários meses
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Como pagou?</span>
            {FINANCE_PAYMENT_METHODS.map((m) => (
              <button key={m} type="button" className="btn btn-secondary" disabled={pending} onClick={() => receive(m)} style={{ minHeight: 36, padding: "6px 12px", fontSize: 13 }}>
                {METHOD_SHORT[m]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setCustom(false);
                setError(null);
              }}
              disabled={pending}
              style={{ background: "none", border: 0, color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", padding: "6px 4px" }}
            >
              Cancelar
            </button>
          </>
        )}
      </div>
      {pending ? <span style={{ width: "100%", fontSize: 12, color: "var(--text-secondary)" }}>A registar…</span> : null}
      {error ? (
        <span role="alert" style={{ width: "100%", fontSize: 13, color: "var(--danger)" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function DoneRow({ done }: { done: Done }) {
  const { item, amount, method } = done;
  const firstName = item.name.split(/\s+/)[0] ?? "";
  const waUrl = item.phone ? buildWhatsAppUrl(item.phone, buildPaymentReceiptMessage(firstName, item.what, eur(amount), METHOD_SHORT[method])) : null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "6px 12px",
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        background: "color-mix(in srgb, #16a34a 12%, transparent)",
      }}
    >
      <Check size={16} aria-hidden style={{ color: "#16a34a" }} />
      <span style={{ flex: "1 1 200px", fontSize: 14 }}>
        <strong>{item.name}</strong> · {item.what} · {eur(amount)} · {METHOD_SHORT[method]}
      </span>
      {waUrl ? (
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none", minHeight: 34 }}>
          <MessageCircle size={15} aria-hidden /> Enviar recibo
        </a>
      ) : (
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Sem telefone para recibo</span>
      )}
    </div>
  );
}
