import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revolutMerchantConfigured } from "@/lib/revolut/merchant";
import { expectedMonthlyAmount, resolveAutoPayPayer } from "@/lib/autopay/service";
import { LOYALTY_MONTHS, loadActiveLoyalty, payerLoyaltyMonthlyDiscount } from "@/lib/loyalty/service";
import { advanceMonthAmount, latePaymentLabel, listLatePayments, nextAdvanceMonth } from "@/lib/tuition-checkout/service";
import { loadAutoPayForStudent } from "@/lib/autopay/service";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { addMonthsToReferenceMonth } from "@/lib/reference-month";
import { AdvancePayButton, LatePaymentsPayForm, LoyaltyAcceptButton } from "./StudentPaymentActions";

const GOLD = "#f5c542";

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

function monthShort(ref: string): string {
  const [y, m] = ref.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-PT", { month: "short", year: "numeric", timeZone: "UTC" });
}

function monthsBetween(a: string, b: string): number {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

const goldCard: React.CSSProperties = {
  borderRadius: 16,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  border: `1px solid color-mix(in srgb, ${GOLD} 50%, transparent)`,
  background: `linear-gradient(160deg, color-mix(in srgb, ${GOLD} 9%, var(--bg-secondary)) 0%, var(--bg-secondary) 60%)`,
};

const pill: React.CSSProperties = { display: "inline-flex", alignItems: "center", fontSize: 11.5, fontWeight: 800, padding: "4px 10px", borderRadius: 999, color: GOLD, border: `1px solid color-mix(in srgb, ${GOLD} 40%, transparent)`, background: `color-mix(in srgb, ${GOLD} 10%, transparent)` };

/** Cartão «Fidelização Kingdom»: oferta (6 meses com desconto) ou estado da fidelização ativa. */
export async function StudentLoyaltySection({ studentId }: { studentId: string }) {
  const admin = getAdminClientOrNull().client;
  if (!admin) return null;
  const payer = await resolveAutoPayPayer(admin, studentId);
  const commitment = await loadActiveLoyalty(admin, payer.payerStudentId);

  if (payer.isFamilyMember) {
    if (!commitment) return null;
    return (
      <section style={goldCard} aria-labelledby="loyalty-title">
        <h2 id="loyalty-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
          🏅 Grupo familiar fidelizado
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>A mensalidade do teu grupo tem o desconto de fidelização em cada membro.</p>
      </section>
    );
  }

  const discount = await payerLoyaltyMonthlyDiscount(admin, payer.payerStudentId, payer.familyGroupId);
  if (!(discount > 0)) return null;

  // No grupo familiar o desconto % do grupo aplica-se depois do desconto de fidelização.
  let groupFactor = 1;
  if (payer.familyGroupId) {
    const { data: g } = await admin.from("FamilyGroup").select("discountPercent").eq("id", payer.familyGroupId).maybeSingle();
    groupFactor = 1 - Number((g as { discountPercent?: number } | null)?.discountPercent ?? 0) / 100;
  }
  const effectiveDiscount = Math.round(discount * groupFactor * 100) / 100;
  const current = currentReferenceMonthLisbon(new Date());
  const amountNow = await expectedMonthlyAmount(admin, payer.payerStudentId, payer.familyGroupId);

  if (commitment) {
    const started = commitment.startMonth <= current;
    const withDiscount = started ? amountNow : Math.max(0, amountNow - effectiveDiscount);
    const periodStart = addMonthsToReferenceMonth(commitment.endMonth, -(commitment.months - 1));
    const done = started ? Math.min(commitment.months, Math.max(0, monthsBetween(periodStart, current) + 1)) : 0;
    const { data: paid } = await admin
      .from("Payment")
      .select("referenceMonth")
      .eq("studentId", payer.payerStudentId)
      .eq("paymentType", "TUITION")
      .eq("status", "PAID")
      .gte("referenceMonth", commitment.startMonth)
      .lte("referenceMonth", current);
    const saved = Math.round(new Set(((paid ?? []) as { referenceMonth: string }[]).map((p) => p.referenceMonth)).size * effectiveDiscount * 100) / 100;
    return (
      <section style={goldCard} aria-labelledby="loyalty-title">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 id="loyalty-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            🏅 Fidelizado · {commitment.months} meses
          </h2>
          <span style={pill}>{euro(withDiscount)}/mês</span>
        </div>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
          {[
            ["Mensalidade", `${euro(withDiscount)} (−${euro(effectiveDiscount)})`],
            [started ? "Período atual até" : "Começa em", started ? monthShort(commitment.endMonth) : monthShort(commitment.startMonth)],
            ["Já poupaste", euro(saved)],
          ].map(([k, v]) => (
            <div key={k} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", background: "var(--bg)" }}>
              <dt style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{k}</dt>
              <dd style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 700 }}>{v}</dd>
            </div>
          ))}
        </dl>
        {started ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>
              <span>
                {done} de {commitment.months} meses
              </span>
              <span>renova sozinha</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--bg)", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${(done / commitment.months) * 100}%`, background: GOLD }} />
            </div>
          </div>
        ) : null}
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          No fim de cada período de {commitment.months} meses a fidelização renova sozinha. Para sair, fala com a secretaria (pagas o desconto já recebido no período em curso).
        </p>
      </section>
    );
  }

  const start = addMonthsToReferenceMonth(current, 1);
  const end = addMonthsToReferenceMonth(start, LOYALTY_MONTHS - 1);
  const newAmount = Math.max(0, amountNow - effectiveDiscount);
  return (
    <section id="fidelizacao" style={{ ...goldCard, scrollMarginTop: 80 }} aria-labelledby="loyalty-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 id="loyalty-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          🏅 Fidelização Kingdom
        </h2>
        <span style={pill}>Paga menos</span>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Compromete-te {LOYALTY_MONTHS} meses e a tua mensalidade desce já a partir do próximo mês.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px", background: "var(--bg)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Sem fidelização</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{euro(amountNow)}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>mês a mês</div>
        </div>
        <div style={{ border: `1px solid ${GOLD}`, boxShadow: `0 0 0 1px ${GOLD} inset`, borderRadius: 14, padding: "12px 14px", background: "var(--bg)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>{LOYALTY_MONTHS} meses</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {euro(newAmount)} <s style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>{euro(amountNow)}</s>
          </div>
          <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 700 }}>Poupas {euro(Math.round(effectiveDiscount * LOYALTY_MONTHS * 100) / 100)} em {LOYALTY_MONTHS} meses</div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6, border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 12px" }}>
        <strong style={{ color: "var(--text-primary)" }}>Como funciona:</strong> pagas {euro(newAmount)}/mês de {monthShort(start)} a {monthShort(end)}. No fim, renova sozinha por mais {LOYALTY_MONTHS} meses. Se saíres antes do fim, pagas o desconto já recebido ({euro(effectiveDiscount)} × meses usados).
      </p>
      <LoyaltyAcceptButton label={`Fidelizar ${LOYALTY_MONTHS} meses · ${euro(newAmount)}/mês`} consentText={`Li e aceito a fidelização de ${LOYALTY_MONTHS} meses (renova sozinha).`} />
    </section>
  );
}

/** Mensalidades em atraso com «Pagar com Revolut». */
export async function StudentLatePaymentsSection({ studentId, justPaid }: { studentId: string; justPaid: boolean }) {
  const admin = getAdminClientOrNull().client;
  if (!admin || !revolutMerchantConfigured) return null;
  const payer = await resolveAutoPayPayer(admin, studentId);
  if (payer.isFamilyMember) return null;
  const late = await listLatePayments(admin, payer.payerStudentId);
  if (!late.length) {
    const paidMsg = justPaid ? (
      <p role="status" style={{ margin: 0, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--success)", background: "color-mix(in srgb, var(--success) 10%, transparent)", fontSize: 14, fontWeight: 700 }}>
        Pagamento recebido. Obrigado!
      </p>
    ) : null;
    // Com o pagamento automático ativo não há nada para pagar à mão.
    const autopay = await loadAutoPayForStudent(admin, payer.payerStudentId);
    if (autopay?.state === "ACTIVE") return paidMsg;
    const month = await nextAdvanceMonth(admin, payer.payerStudentId);
    const amount = await advanceMonthAmount(admin, payer.payerStudentId, payer.familyGroupId, month);
    if (!(amount > 0)) return paidMsg;
    const loyalty = await loadActiveLoyalty(admin, payer.payerStudentId);
    const withLoyalty = !!loyalty && month >= loyalty.startMonth;
    return (
      <>
        {paidMsg}
        <section aria-labelledby="advance-title" style={{ borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 id="advance-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
              Mensalidade de <span style={{ textTransform: "capitalize" }}>{monthShort(month)}</span>
            </h2>
            <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 999, color: "var(--success)", border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)" }}>Tudo em dia</span>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-secondary)" }}>
            Não tens nada em atraso. Podes pagar já a próxima mensalidade{payer.familyGroupId ? " do grupo familiar" : ""}
            {withLoyalty ? " (já com o desconto da fidelização)" : ""}.
          </p>
          <AdvancePayButton label={`💳 Pagar ${monthShort(month)} · ${euro(amount)} com Revolut`} />
        </section>
      </>
    );
  }
  const total = late.reduce((t, p) => t + p.amount, 0);
  return (
    <section
      aria-labelledby="late-title"
      style={{ borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12, border: "1px solid color-mix(in srgb, var(--danger) 50%, transparent)", background: "linear-gradient(160deg, color-mix(in srgb, var(--danger) 10%, var(--bg-secondary)) 0%, var(--bg-secondary) 60%)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 id="late-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          {late.length === 1 ? "Tens 1 pagamento em atraso" : `Tens ${late.length} pagamentos em atraso`}
        </h2>
        <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 999, color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 40%, transparent)" }}>{euro(total)}</span>
      </div>
      {justPaid ? <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Se acabaste de pagar, a confirmação chega em instantes. Atualiza a página daqui a pouco.</p> : null}
      <LatePaymentsPayForm items={late.map((p) => ({ id: p.id, label: latePaymentLabel(p), amount: p.amount }))} />
    </section>
  );
}

/** Atalho junto ao plano: «Com fidelização pagas X €» → leva ao cartão da fidelização. */
export async function StudentLoyaltyShortcut({ studentId }: { studentId: string }) {
  const admin = getAdminClientOrNull().client;
  if (!admin) return null;
  const payer = await resolveAutoPayPayer(admin, studentId);
  if (payer.isFamilyMember) return null;
  if (await loadActiveLoyalty(admin, payer.payerStudentId)) return null;
  const discount = await payerLoyaltyMonthlyDiscount(admin, payer.payerStudentId, payer.familyGroupId);
  if (!(discount > 0)) return null;
  let groupFactor = 1;
  if (payer.familyGroupId) {
    const { data: g } = await admin.from("FamilyGroup").select("discountPercent").eq("id", payer.familyGroupId).maybeSingle();
    groupFactor = 1 - Number((g as { discountPercent?: number } | null)?.discountPercent ?? 0) / 100;
  }
  const now = await expectedMonthlyAmount(admin, payer.payerStudentId, payer.familyGroupId);
  const withLoyalty = Math.max(0, Math.round((now - discount * groupFactor) * 100) / 100);
  return (
    <a
      href="#fidelizacao"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 14, textDecoration: "none", color: "var(--text-primary)", border: `1px solid color-mix(in srgb, ${GOLD} 50%, transparent)`, background: `color-mix(in srgb, ${GOLD} 8%, var(--bg-secondary))`, fontSize: 14 }}
    >
      <span>
        🏅 Com fidelização pagas <strong>{euro(withLoyalty)}/mês</strong> <s style={{ color: "var(--text-secondary)" }}>{euro(now)}</s>
      </span>
      <strong style={{ color: GOLD, whiteSpace: "nowrap" }}>Fidelizar ↓</strong>
    </a>
  );
}
