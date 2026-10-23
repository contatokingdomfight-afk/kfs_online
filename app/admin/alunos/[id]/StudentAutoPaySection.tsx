import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAutoPayForStudent, resolveAutoPayPayer, type AutoPayState } from "@/lib/autopay/service";
import { billingDayLabel } from "@/lib/autopay/billing-day";
import { cancelAutoPayAdminAction, setAutoPayBillingDayAction, syncAutoPayAction } from "./autopay-actions";

const STATE_LABEL: Record<AutoPayState, { text: string; color: string }> = {
  ACTIVE: { text: "⚡ Ativo", color: "var(--success)" },
  PENDING: { text: "A aguardar 1.ª cobrança", color: "var(--warning)" },
  OVERDUE: { text: "Cobrança falhou", color: "var(--danger)" },
  CANCELLED: { text: "Cancelado", color: "var(--text-secondary)" },
};

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

function dateLabel(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "short", year: "numeric" }) : "—";
}

/** Ficha do aluno: estado do pagamento automático, dia de cobrança editável e cancelar. */
export async function StudentAutoPaySection({ supabase, studentId, sectionTitle, row }: { supabase: SupabaseClient; studentId: string; sectionTitle: React.CSSProperties; row: React.CSSProperties }) {
  const payer = await resolveAutoPayPayer(supabase, studentId);
  const ap = await loadAutoPayForStudent(supabase, payer.payerStudentId);
  if (!ap) return null;

  const st = STATE_LABEL[ap.state];
  const fact = (k: string, v: string) => (
    <div style={{ ...row, flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>{k}</span>
      <strong style={{ fontSize: 14 }}>{v}</strong>
    </div>
  );
  const btn: React.CSSProperties = { minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" };

  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <h2 style={sectionTitle}>Pagamento automático</h2>
        <strong style={{ fontSize: 12.5, color: st.color }}>{st.text}</strong>
      </div>
      {payer.isFamilyMember ? (
        <div style={{ ...row, color: "var(--text-secondary)" }}>
          Pago pelo titular do grupo familiar.{" "}
          <Link href={`/admin/alunos/${payer.payerStudentId}`} style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>
            Ver titular
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
            {fact("Valor", `${euro(ap.amount)}/mês${ap.familyGroupId ? " · grupo" : ""}`)}
            {fact("Método", ap.paymentMethodLabel ?? "—")}
            {fact("Próxima cobrança", dateLabel(ap.nextChargeAt))}
            {fact("Desde", dateLabel(ap.activatedAt))}
          </div>
          {ap.state !== "CANCELLED" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <form action={setAutoPayBillingDayAction} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input type="hidden" name="payerStudentId" value={payer.payerStudentId} />
                <input type="hidden" name="studentId" value={studentId} />
                <label style={{ fontSize: 13, color: "var(--text-secondary)" }} htmlFor="autopay-day">
                  Dia de cobrança
                </label>
                <input id="autopay-day" name="billingDay" type="number" min={1} max={31} required defaultValue={ap.billingDay ?? undefined} className="input" style={{ width: 72, minHeight: 36 }} />
                <button type="submit" style={btn}>
                  Guardar dia
                </button>
              </form>
              <form action={syncAutoPayAction}>
                <input type="hidden" name="payerStudentId" value={payer.payerStudentId} />
                <input type="hidden" name="studentId" value={studentId} />
                <button type="submit" style={btn}>
                  Atualizar da Revolut
                </button>
              </form>
              <details>
                <summary style={{ ...btn, listStyle: "none", display: "inline-flex", alignItems: "center", color: "var(--text-secondary)", background: "transparent" }}>Cancelar automático</summary>
                <form action={cancelAutoPayAdminAction} style={{ marginTop: 6 }}>
                  <input type="hidden" name="payerStudentId" value={payer.payerStudentId} />
                  <input type="hidden" name="studentId" value={studentId} />
                  <button type="submit" style={{ ...btn, background: "var(--danger)", border: "1px solid var(--danger)", color: "#fff" }}>
                    Confirmar cancelamento
                  </button>
                </form>
              </details>
            </div>
          )}
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {ap.billingDay ? `Cobra no ${billingDayLabel(ap.billingDay)}. ` : ""}Mudar o dia move já a próxima cobrança para esse dia (pode ficar mais perto ou mais longe). O valor acompanha o plano sozinho a partir da cobrança seguinte.
          </p>
        </div>
      )}
    </section>
  );
}
