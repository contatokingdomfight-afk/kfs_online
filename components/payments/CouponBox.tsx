"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { applyStudentCoupon, removeStudentCoupon } from "@/app/dashboard/financeiro/coupon-actions";

export type CouponBoxApplied = { couponId: string; code: string; discount: number };

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

/**
 * Campo «Tens um código de desconto?». Não é um <form> (vive dentro do formulário de pagamento):
 * chama as server actions diretamente e atualiza a página.
 */
export function CouponBox({ applied }: { applied: CouponBoxApplied[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply() {
    if (!code.trim()) return;
    setError(null);
    start(async () => {
      const r = await applyStudentCoupon(code);
      if (r.error) setError(r.error);
      else {
        setCode("");
        router.refresh();
      }
    });
  }

  function remove(couponId: string) {
    setError(null);
    start(async () => {
      const r = await removeStudentCoupon(couponId);
      if (r.error) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
      {applied.map((a) => (
        <div
          key={a.couponId}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            padding: "9px 12px",
            borderRadius: 8,
            background: "color-mix(in srgb, #ec4899 14%, transparent)",
            border: "1px solid color-mix(in srgb, #ec4899 45%, transparent)",
          }}
        >
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Ticket size={16} aria-hidden /> <strong style={{ color: "#ec4899" }}>{a.code}</strong> aplicado · −{eur(a.discount)}
          </span>
          <button
            type="button"
            onClick={() => remove(a.couponId)}
            disabled={pending}
            style={{ background: "none", border: 0, color: "var(--text-secondary)", textDecoration: "underline", cursor: "pointer", font: "inherit", fontSize: 12.5 }}
          >
            Remover
          </button>
        </div>
      ))}
      <label htmlFor="coupon-code" style={{ fontWeight: 600 }}>
        Tens um código de desconto?
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="coupon-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Ex.: OUTUBROROSA"
          autoCapitalize="characters"
          autoComplete="off"
          className="input"
          style={{ flex: 1, minWidth: 0, textTransform: "uppercase" }}
        />
        <button type="button" className="btn btn-secondary" onClick={apply} disabled={pending || !code.trim()}>
          {pending ? "…" : "Aplicar"}
        </button>
      </div>
      {error ? <p style={{ margin: 0, color: "var(--danger)", fontSize: 12.5 }}>{error}</p> : null}
    </div>
  );
}
