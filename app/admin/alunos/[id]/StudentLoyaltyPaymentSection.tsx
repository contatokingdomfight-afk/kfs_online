import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAutoPayPayer } from "@/lib/autopay/service";
import { LOYALTY_MONTHS, loadActiveLoyalty, loyaltyExitPenalty, payerLoyaltyMonthlyDiscount } from "@/lib/loyalty/service";
import { latePaymentLabel, listLatePayments } from "@/lib/tuition-checkout/service";
import { revolutMerchantConfigured, revolutMerchantEnv } from "@/lib/revolut/merchant";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { adminCreatePaymentLinkAction, adminEndLoyaltyAction, adminStartLoyaltyAction } from "./loyalty-actions";

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

function monthShort(ref: string): string {
  const [y, m] = ref.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-PT", { month: "short", year: "numeric", timeZone: "UTC" });
}

const btn: React.CSSProperties = { minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" };

/** Ficha do aluno: fidelização (estado, ativar, terminar com o valor de saída) e link de pagamento Revolut das mensalidades em atraso. */
export async function StudentLoyaltyPaymentSection({ supabase, studentId, phone, firstName, sectionTitle, row }: { supabase: SupabaseClient; studentId: string; phone: string | null; firstName: string; sectionTitle: React.CSSProperties; row: React.CSSProperties }) {
  const payer = await resolveAutoPayPayer(supabase, studentId);
  // Membro de um grupo: a fidelização e a mensalidade estão no titular; aqui só as taxas dele (inscrição/seguro).
  const payingId = payer.isFamilyMember ? studentId : payer.payerStudentId;
  const [discount, commitment, late] = await Promise.all([
    payer.isFamilyMember ? Promise.resolve(0) : payerLoyaltyMonthlyDiscount(supabase, payer.payerStudentId, payer.familyGroupId),
    payer.isFamilyMember ? Promise.resolve(null) : loadActiveLoyalty(supabase, payer.payerStudentId),
    listLatePayments(supabase, payingId),
  ]);
  const penalty = commitment ? await loyaltyExitPenalty(supabase, commitment, payer.familyGroupId) : null;
  const current = currentReferenceMonthLisbon(new Date());

  // Último link por pagar (o mesmo conjunto em atraso é reaproveitado ao gerar de novo).
  const { data: openLinks, error: linkErr } = await supabase
    .from("PaymentCheckout")
    .select("checkoutUrl, amount, createdAt, environment")
    .eq("studentId", payingId)
    .eq("state", "PENDING")
    .order("createdAt", { ascending: false })
    .limit(1);
  const link = !linkErr ? ((openLinks ?? []) as { checkoutUrl: string | null; amount: number | string; environment: string }[]).find((l) => l.checkoutUrl && l.environment === revolutMerchantEnv) : undefined;
  const lateTotal = late.reduce((t, p) => t + p.amount, 0);
  const waUrl =
    link?.checkoutUrl && phone
      ? buildWhatsAppUrl(phone, `Olá ${firstName}! Aqui está o link para pagares ${euro(Number(link.amount))} na Kingdom Fight School (cartão, Apple Pay ou Revolut): ${link.checkoutUrl}\nFica pago na hora, não precisas de enviar comprovativo. Obrigado! 🥊`)
      : null;

  return (
    <>
      {(discount > 0 || commitment) && (
        <section style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <h2 style={sectionTitle}>Fidelização</h2>
            {commitment ? <strong style={{ fontSize: 12.5, color: "#f5c542" }}>🏅 Ativa</strong> : null}
          </div>
          {commitment ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ ...row, flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  🏅 <strong>{LOYALTY_MONTHS} meses</strong> · −{euro(discount)}/mês{payer.familyGroupId ? " (soma do grupo)" : ""} · desde {monthShort(commitment.startMonth)}
                  {commitment.startMonth > current ? " (começa no próximo mês)" : ` · período atual até ${monthShort(commitment.endMonth)}`}
                  {commitment.renewals ? ` · renovada ${commitment.renewals}×` : ""}
                </span>
              </div>
              <details>
                <summary style={{ ...btn, listStyle: "none", color: "var(--text-secondary)", background: "transparent" }}>Terminar fidelização</summary>
                <div style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 13 }}>
                    Saída antes do fim: devolve o desconto recebido neste período — <strong>{euro(penalty?.amount ?? 0)}</strong> ({penalty?.months ?? 0} mês(es) × {euro(penalty?.monthlyDiscount ?? 0)}).
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <form action={adminEndLoyaltyAction}>
                      <input type="hidden" name="studentId" value={studentId} />
                      <input type="hidden" name="charge" value="1" />
                      <button type="submit" style={{ ...btn, background: "var(--danger)", border: "1px solid var(--danger)", color: "#fff" }}>
                        Terminar e cobrar {euro(penalty?.amount ?? 0)}
                      </button>
                    </form>
                    <form action={adminEndLoyaltyAction}>
                      <input type="hidden" name="studentId" value={studentId} />
                      <input type="hidden" name="charge" value="0" />
                      <button type="submit" style={btn}>
                        Terminar sem cobrar
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <form action={adminStartLoyaltyAction} style={{ ...row, flexWrap: "wrap" }}>
              <input type="hidden" name="studentId" value={studentId} />
              <span style={{ flex: 1, minWidth: 0, color: "var(--text-secondary)" }}>
                Sem fidelização. Com {LOYALTY_MONTHS} meses: −{euro(discount)}/mês{payer.familyGroupId ? " (soma do grupo)" : ""}, a partir do próximo mês, renova sozinha.
              </span>
              <button type="submit" style={{ ...btn, background: "#f5c542", border: "1px solid #f5c542", color: "#111" }}>
                🏅 Fidelizar {LOYALTY_MONTHS} meses
              </button>
            </form>
          )}
        </section>
      )}

      {revolutMerchantConfigured && late.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <h2 style={sectionTitle}>Em atraso · {euro(lateTotal)}</h2>
          <div style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>{late.map(latePaymentLabel).join(" · ")}</span>
            {link?.checkoutUrl ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: 10, padding: "6px 8px 6px 12px", fontSize: 12.5, color: "var(--text-secondary)", minWidth: 0 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.checkoutUrl}</span>
                  <CopyTextButton text={link.checkoutUrl} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {waUrl ? (
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" style={btn}>
                      💬 Enviar por WhatsApp
                    </a>
                  ) : (
                    <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Sem telefone: copia o link e envia-o.</span>
                  )}
                  {Number(link.amount) !== Math.round(lateTotal * 100) / 100 ? (
                    <form action={adminCreatePaymentLinkAction}>
                      <input type="hidden" name="studentId" value={studentId} />
                      <button type="submit" style={btn}>
                        Atualizar link ({euro(lateTotal)})
                      </button>
                    </form>
                  ) : null}
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Fica pago sozinho quando o aluno pagar · {euro(Number(link.amount))}</span>
                </div>
              </>
            ) : (
              <form action={adminCreatePaymentLinkAction}>
                <input type="hidden" name="studentId" value={studentId} />
                <button type="submit" style={{ ...btn, background: "var(--primary)", border: "1px solid var(--primary)", color: "#fff" }}>
                  💳 Gerar link de pagamento ({euro(lateTotal)})
                </button>
              </form>
            )}
          </div>
          <Link href={`/admin/alunos/${studentId}/plano-seguro`} style={{ display: "inline-block", marginTop: 6, color: "var(--primary)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Registar pagamento à mão →
          </Link>
        </section>
      )}
    </>
  );
}
