import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getRevolutConfig } from "@/lib/revolut/client";
import { loadPorReceberItems } from "@/lib/finance/por-receber";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { itemLabel, type MatchSuggestion } from "@/lib/revolut/match";
import { confirmBankMatch, ignoreBankTransaction, syncRevolutNow } from "./actions";

export const dynamic = "force-dynamic";

type Tx = {
  id: string;
  occurredAt: string;
  amount: number | string;
  payerName: string | null;
  reference: string | null;
  matchStatus: "AUTO" | "CONFIRMED" | "SUGGESTED" | "UNMATCHED" | "IGNORED";
  matchLabel: string | null;
  suggestions: MatchSuggestion[] | null;
};

const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const CHIP: Record<Tx["matchStatus"], { text: string; color: string; bg: string }> = {
  AUTO: { text: "Automático", color: "var(--success)", bg: "rgba(34,197,94,0.14)" },
  CONFIRMED: { text: "Confirmado", color: "var(--success)", bg: "rgba(34,197,94,0.14)" },
  SUGGESTED: { text: "Por confirmar", color: "var(--warning)", bg: "rgba(250,204,21,0.14)" },
  UNMATCHED: { text: "Por associar", color: "var(--text-secondary)", bg: "rgba(161,161,170,0.14)" },
  IGNORED: { text: "Ignorado", color: "var(--text-secondary)", bg: "transparent" },
};
const ERRORS: Record<string, string> = {
  config: "Faltam as variáveis REVOLUT_* na Vercel.",
  "sem-codigo": "A Revolut não devolveu o código de autorização.",
  estado: "A autorização expirou ou veio de outro pedido. Tenta outra vez.",
  "sem-token": "A Revolut não devolveu o token de acesso.",
  gravar: "Não foi possível guardar a ligação.",
  troca: "A Revolut recusou a troca do código (certificado, ClientID ou domínio).",
};

export default async function AdminFinanceiroBancoPage({ searchParams }: { searchParams: Promise<{ erro?: string; ligado?: string }> }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const { erro, ligado } = await searchParams;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const configured = Boolean(getRevolutConfig());

  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const [{ data: conn }, { data: txRows }] = await Promise.all([
    supabase.from("RevolutConnection").select("connectedAt, lastSyncAt, lastSyncError").eq("id", "default").maybeSingle(),
    supabase
      .from("BankTransaction")
      .select("id, occurredAt, amount, payerName, reference, matchStatus, matchLabel, suggestions")
      .gte("occurredAt", since)
      .order("occurredAt", { ascending: false })
      .limit(300),
  ]);
  const connection = conn as { connectedAt: string; lastSyncAt: string | null; lastSyncError: string | null } | null;
  const txs = (txRows ?? []) as Tx[];
  const pending = txs.filter((t) => t.matchStatus === "SUGGESTED" || t.matchStatus === "UNMATCHED");
  const openItems = pending.length ? await loadPorReceberItems(supabase, currentReferenceMonthLisbon(new Date())) : [];
  const thisMonthKey = currentReferenceMonthLisbon(new Date());
  const thisMonth = txs.filter((t) => t.occurredAt.slice(0, 7) === thisMonthKey);

  const kpi = (label: string, value: string, color?: string) => (
    <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" }) : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="card" style={{ padding: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <div style={{ flex: "1 1 260px" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Transferências Revolut</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {connection
              ? `Ligada desde ${fmt(connection.connectedAt)} · última leitura ${fmt(connection.lastSyncAt)}. A plataforma só lê movimentos.`
              : "Ainda não ligada. A plataforma só vai ler os movimentos recebidos, sem poder fazer pagamentos."}
          </p>
          {connection?.lastSyncError ? <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--danger)" }}>Último erro: {connection.lastSyncError}</p> : null}
          {erro ? <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--danger)" }}>{ERRORS[erro] ?? "Erro ao ligar à Revolut."}</p> : null}
          {ligado ? <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--success)", fontWeight: 700 }}>Revolut ligada e primeira leitura feita.</p> : null}
        </div>
        {!configured ? (
          <span style={{ fontSize: 13, color: "var(--warning)" }}>Configura primeiro as variáveis REVOLUT_* na Vercel.</span>
        ) : connection ? (
          <form action={syncRevolutNow}>
            <button type="submit" className="btn btn-primary" style={{ minHeight: 40 }}>
              Sincronizar agora
            </button>
          </form>
        ) : (
          <a href="/api/revolut/connect" className="btn btn-primary" style={{ minHeight: 40, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Ligar à Revolut
          </a>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {kpi("Recebido este mês", eur(thisMonth.reduce((a, t) => a + Number(t.amount), 0)))}
        {kpi("Confirmados automaticamente", String(thisMonth.filter((t) => t.matchStatus === "AUTO").length))}
        {kpi("Por confirmar", String(txs.filter((t) => t.matchStatus === "SUGGESTED").length), "var(--warning)")}
        {kpi("Por associar", String(txs.filter((t) => t.matchStatus === "UNMATCHED").length))}
      </div>

      <section className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: 12 }}>
              {["Data", "De", "Descritivo", "Valor", "Correspondência", ""].map((h) => (
                <th key={h} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "var(--text-secondary)" }}>
                  Sem transferências recebidas nos últimos 60 dias.
                </td>
              </tr>
            ) : (
              txs.map((t) => {
                const chip = CHIP[t.matchStatus];
                const sugs = (t.suggestions ?? []).filter((s) => openItems.some((i) => i.key === s.itemKey));
                const options = sugs.length ? sugs : openItems.map((i) => ({ itemKey: i.key, label: itemLabel(i), amount: i.amount }));
                const open = t.matchStatus === "SUGGESTED" || t.matchStatus === "UNMATCHED";
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", opacity: t.matchStatus === "IGNORED" ? 0.55 : 1 }}>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{fmt(t.occurredAt)}</td>
                    <td style={{ padding: "10px 12px" }}>{t.payerName ?? "—"}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{t.reference ?? "—"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>{eur(Number(t.amount))}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 9, color: chip.color, background: chip.bg }}>{chip.text}</span>
                      {t.matchLabel ? <div style={{ fontSize: 12, marginTop: 4 }}>{t.matchLabel}</div> : null}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {open ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {options.length ? (
                            <form action={confirmBankMatch} style={{ display: "flex", gap: 6 }}>
                              <input type="hidden" name="txId" value={t.id} />
                              <select
                                name="itemKey"
                                className="input"
                                style={{ minHeight: 34, fontSize: 12, maxWidth: 260 }}
                                defaultValue={sugs.length === 1 ? sugs[0].itemKey : ""}
                                required
                              >
                                {sugs.length !== 1 ? <option value="">Associar a…</option> : null}
                                {options.map((o) => (
                                  <option key={o.itemKey} value={o.itemKey}>{`${o.label} · ${eur(o.amount)}`}</option>
                                ))}
                              </select>
                              <button type="submit" className="btn btn-primary" style={{ minHeight: 34, fontSize: 12 }}>
                                Confirmar
                              </button>
                            </form>
                          ) : null}
                          <form action={ignoreBankTransaction}>
                            <input type="hidden" name="txId" value={t.id} />
                            <button type="submit" className="btn" style={{ minHeight: 34, fontSize: 12 }}>
                              Ignorar
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        Mensalidades e encomendas ficam pagas sozinhas quando a referência (KFS-0123 ou KFS-ENC-0045) ou o nome e o valor batem certo. Seguros e matrículas pedem sempre
        confirmação. Ao confirmares uma sugestão, a plataforma aprende quem paga por quem.
      </p>
    </div>
  );
}
