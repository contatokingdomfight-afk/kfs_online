"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { createDropInStudent, type CreateDropInStudentResult } from "../drop-in-actions";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";
import { FINANCE_PAYMENT_METHODS, FINANCE_PAYMENT_METHOD_LABELS_PT } from "@/lib/finance-payment-method";
import {
  calculateDropInPrice,
  formatDropInPriceEur,
  type DropInPricingContext,
} from "@/lib/drop-in-sessions-pricing";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";

const MODALITIES = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

type Props = {
  backHref?: string;
  studentDetailHref?: (studentId: string) => string;
};

export function DropInQuickRegisterForm({
  backHref = "/admin/alunos",
  studentDetailHref = (id) => `/admin/alunos/${id}/plano-seguro`,
}: Props) {
  const router = useRouter();
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [saved, setSaved] = useState<CreateDropInStudentResult | null>(null);

  const referenceMonth = currentReferenceMonthLisbon(new Date());
  const pricingContext: DropInPricingContext = { isKingdomWeekPlan: false, weekCapExhausted: false };
  const quote = useMemo(() => calculateDropInPrice(quantity, pricingContext), [quantity]);

  const [state, formAction] = useFormState(createDropInStudent, null as CreateDropInStudentResult | null);

  useEffect(() => {
    async function loadSchools() {
      try {
        const response = await fetch("/api/schools");
        if (response.ok) {
          const data = await response.json();
          setSchools(data.schools || []);
        }
      } catch (error) {
        console.error("Error loading schools:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSchools();
  }, []);

  useEffect(() => {
    if (state?.success && state.studentId) {
      setSaved(state);
      setCredentialsOpen(true);
    }
  }, [state]);

  function closeCredentialsModal() {
    const studentId = saved?.studentId;
    setCredentialsOpen(false);
    setSaved(null);
    if (studentId) router.push(studentDetailHref(studentId));
  }

  return (
    <>
      <form action={formAction} className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Cria conta mínima (nome, email, NIF, telemóvel, modalidade), regista o pagamento e concede aulas avulsas
          (€10/aula). O aluno pode fazer check-in na modalidade escolhida.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Nome *</label>
            <input name="name" type="text" required className="input w-full" autoComplete="name" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Email *</label>
            <input name="email" type="email" required className="input w-full" autoComplete="email" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>NIF *</label>
            <input name="taxId" type="text" required className="input w-full" inputMode="numeric" autoComplete="off" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Telemóvel *</label>
            <input name="phone" type="tel" required className="input w-full" autoComplete="tel" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Escola *</label>
            <select name="schoolId" required className="input w-full" disabled={loading}>
              <option value="">{loading ? "A carregar…" : "Escolher escola"}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Modalidade *</label>
            <select name="primaryModality" required className="input w-full">
              <option value="">Escolher modalidade</option>
              {MODALITIES.map((m) => (
                <option key={m} value={m}>
                  {MODALITY_LABELS[m] ?? m}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Mês</label>
              <input name="referenceMonth" type="month" defaultValue={referenceMonth} className="input" style={{ width: 140 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>N.º aulas *</label>
              <input
                name="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="input"
                style={{ width: 90 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Total (€)</label>
              <input
                name="amount"
                type="number"
                readOnly
                value={formatDropInPriceEur(quote.amountEur)}
                className="input"
                style={{ width: 100, background: "var(--surface-secondary, #f5f5f5)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Pagamento *</label>
              <select name="paymentMethod" className="input" style={{ width: 160 }} defaultValue="CASH">
                {FINANCE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {FINANCE_PAYMENT_METHOD_LABELS_PT[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
            {quote.summaryLabel} · €{formatDropInPriceEur(quote.amountEur)}
          </p>
        </div>

        {state?.error ? <p style={{ color: "var(--danger)", fontSize: 14, marginTop: 12 }}>{state.error}</p> : null}

        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary">
            Criar aluno avulso
          </button>
          <Link href={backHref} className="btn btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>

      {credentialsOpen && saved?.loginEmail && saved.initialPassword ? (
        <SuccessConfirmModal
          open={credentialsOpen}
          title="Aluno avulso criado"
          onClose={closeCredentialsModal}
          closeLabel="Ir para a ficha"
          message={`Entrega estas credenciais ao aluno para check-in na app:\n\nEmail: ${saved.loginEmail}\nSenha inicial: ${saved.initialPassword}${
            saved.syntheticLoginEmail ? "\n\nEmail interno gerado automaticamente." : ""
          }`}
        />
      ) : null}
    </>
  );
}
