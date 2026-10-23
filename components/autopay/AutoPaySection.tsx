import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revolutMerchantConfigured } from "@/lib/revolut/merchant";
import { expectedMonthlyAmount, firstMonthToPay, loadAutoPayForStudent, resolveAutoPayPayer, syncAutoPaySafe } from "@/lib/autopay/service";
import { billingDayLabel } from "@/lib/autopay/billing-day";
import { AutoPayActivateButton, AutoPayCancelButton } from "./AutoPayButtons";

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

function monthName(ref: string): string {
  const [y, m] = ref.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-PT", { month: "long", timeZone: "UTC" });
}

function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "short" });
}

const card = (tone: "hero" | "ok" | "bad" | "plain"): React.CSSProperties => ({
  borderRadius: 16,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  border: `1px solid ${tone === "hero" ? "color-mix(in srgb, var(--primary) 55%, transparent)" : tone === "ok" ? "color-mix(in srgb, var(--success) 45%, transparent)" : tone === "bad" ? "color-mix(in srgb, var(--danger) 55%, transparent)" : "var(--border)"}`,
  background:
    tone === "hero"
      ? "linear-gradient(160deg, color-mix(in srgb, var(--primary) 12%, var(--bg-secondary)) 0%, var(--bg-secondary) 60%)"
      : tone === "ok"
        ? "linear-gradient(160deg, color-mix(in srgb, var(--success) 10%, var(--bg-secondary)) 0%, var(--bg-secondary) 60%)"
        : tone === "bad"
          ? "linear-gradient(160deg, color-mix(in srgb, var(--danger) 12%, var(--bg-secondary)) 0%, var(--bg-secondary) 60%)"
          : "var(--bg-secondary)",
});

const pill = (color: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 800, padding: "4px 10px", borderRadius: 999, color, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` });

function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", background: "var(--bg)" }}>
          <dt style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{k}</dt>
          <dd style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 700 }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Cartão «Pagamento automático» em Plano e pagamentos (estados: por ativar, a confirmar, ativo, falhou). */
export async function AutoPaySection({ studentId, justReturned }: { studentId: string; justReturned: boolean }) {
  const admin = getAdminClientOrNull().client;
  if (!admin || !revolutMerchantConfigured) return null;

  const payer = await resolveAutoPayPayer(admin, studentId);
  let row = await loadAutoPayForStudent(admin, payer.payerStudentId);
  // Regresso da página da Revolut: a ativação não tem evento próprio, por isso confirma-se já aqui.
  if (row && row.state === "PENDING" && justReturned) row = await syncAutoPaySafe(admin, row);

  if (payer.isFamilyMember) {
    const active = row?.state === "ACTIVE";
    return (
      <section style={card("plain")} aria-labelledby="autopay-title">
        <h2 id="autopay-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          ⚡ Pagamento automático
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {active
            ? `A mensalidade do teu grupo familiar é cobrada automaticamente ao titular (${row?.billingDay ? billingDayLabel(row.billingDay) : "todos os meses"}). Não precisas de fazer nada.`
            : "A mensalidade do teu grupo familiar é paga pelo titular do grupo. O titular pode ativar o pagamento automático na conta dele."}
        </p>
      </section>
    );
  }

  const amount = row && row.state !== "CANCELLED" ? row.amount : await expectedMonthlyAmount(admin, payer.payerStudentId, payer.familyGroupId);
  if (!(amount > 0)) return null;

  const { data: st } = await admin.from("Student").select("planId").eq("id", payer.payerStudentId).maybeSingle();
  const planId = (st as { planId?: string | null } | null)?.planId;
  const { data: plan } = planId ? await admin.from("Plan").select("name").eq("id", planId).maybeSingle() : { data: null };
  const planName = payer.familyGroupId ? "Grupo familiar" : ((plan as { name?: string } | null)?.name ?? "O teu plano");

  if (row?.state === "ACTIVE") {
    return (
      <section style={card("ok")} aria-labelledby="autopay-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 id="autopay-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            ⚡ Pagamento automático
          </h2>
          <span style={pill("var(--success)")}>● Ativo</span>
        </div>
        {justReturned ? <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Está feito! A tua mensalidade passa a ser cobrada sozinha.</p> : null}
        <Facts
          items={[
            ["Método", row.paymentMethodLabel ?? "Cartão / Revolut"],
            ["Próxima cobrança", row.nextChargeAt ? `${dateLabel(row.nextChargeAt)} · ${euro(row.amount)}` : euro(row.amount)],
            ["Dia de cobrança", row.billingDay ? billingDayLabel(row.billingDay) : "—"],
          ]}
        />
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Avisamos-te 3 dias antes de cada cobrança. Se mudares de plano na secretaria, o valor atualiza sozinho. Para usar outro cartão, cancela e ativa de novo.
        </p>
        <AutoPayCancelButton note="As mensalidades já pagas ficam pagas. A partir da próxima, voltas a pagar por transferência ou na secretaria. O teu plano não muda." />
      </section>
    );
  }

  if (row?.state === "OVERDUE") {
    return (
      <section style={card("bad")} aria-labelledby="autopay-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 id="autopay-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            ⚠️ Não conseguimos cobrar a mensalidade
          </h2>
          <span style={pill("var(--danger)")}>Cobrança falhou</span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          O banco recusou o pagamento de {euro(row.amount)}{row.paymentMethodLabel ? ` (${row.paymentMethodLabel})` : ""}. A Revolut volta a tentar; também podes ativar de novo com outro cartão ou pagar por transferência (dados abaixo).
        </p>
        <AutoPayActivateButton label={`Ativar com outro cartão · ${euro(amount)}/mês`} planName={planName} amountLabel={euro(amount)} firstChargeLabel={`${euro(amount)} (mensalidade em atraso)`} />
      </section>
    );
  }

  const firstMonth = await firstMonthToPay(admin, payer.payerStudentId);
  const pending = row?.state === "PENDING";
  return (
    <section style={card("hero")} aria-labelledby="autopay-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 id="autopay-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          ⚡ Pagamento automático
        </h2>
        <span style={pill(pending ? "var(--warning)" : "var(--text-secondary)")}>{pending ? "Por concluir" : "Recomendado"}</span>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {pending
          ? justReturned
            ? "Estamos a confirmar o pagamento com a Revolut. Atualiza a página daqui a uns segundos."
            : "Começaste a ativar mas o pagamento não foi concluído. Podes tentar de novo."
          : "Ativa uma vez e esquece: a mensalidade é cobrada sozinha todos os meses, no dia em que ativares."}
      </p>
      {!pending ? (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
          {["Nunca mais te esqueces de pagar nem envias comprovativos", "Cartão, Apple Pay, Google Pay ou conta Revolut", "Pagamento seguro feito pela Revolut — não guardamos o teu cartão", "Cancelas quando quiseres, aqui mesmo"].map((t) => (
            <li key={t} style={{ display: "flex", gap: 8 }}>
              <span aria-hidden style={{ color: "var(--success)", fontWeight: 800 }}>
                ✓
              </span>
              {t}
            </li>
          ))}
        </ul>
      ) : null}
      <AutoPayActivateButton
        label={pending ? `Tentar de novo · ${euro(amount)}/mês` : `Ativar pagamento automático · ${euro(amount)}/mês`}
        planName={planName}
        amountLabel={euro(amount)}
        firstChargeLabel={`${euro(amount)} · ${monthName(firstMonth)}`}
      />
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>A 1.ª cobrança paga {monthName(firstMonth)}.</p>
    </section>
  );
}
