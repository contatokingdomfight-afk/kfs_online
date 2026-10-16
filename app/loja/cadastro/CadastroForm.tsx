"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveShopProfile, type ShopActionResult } from "../actions";
import type { ShopCustomerProfile } from "@/lib/retail/public-shop";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ minHeight: 48, fontWeight: 700 }}>
      {pending ? "A guardar…" : "Guardar e continuar"}
    </button>
  );
}

const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" };

export function CadastroForm({ next, initial }: { next: string; initial: ShopCustomerProfile }) {
  const [state, action] = useActionState(saveShopProfile, null as ShopActionResult | null);
  return (
    <form action={action} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="next" value={next} />
      <label style={lbl}>
        Nome completo
        <input className="input" name="fullName" defaultValue={initial.fullName} required autoComplete="name" />
      </label>
      <label style={lbl}>
        Telefone
        <input className="input" name="phone" type="tel" defaultValue={initial.phone} required autoComplete="tel" />
      </label>
      <label style={lbl}>
        Morada
        <input className="input" name="addressLine" defaultValue={initial.addressLine} required autoComplete="street-address" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <label style={lbl}>
          Código postal
          <input className="input" name="postalCode" placeholder="0000-000" defaultValue={initial.postalCode} required autoComplete="postal-code" />
        </label>
        <label style={lbl}>
          Cidade
          <input className="input" name="city" defaultValue={initial.city} required autoComplete="address-level2" />
        </label>
      </div>
      {state?.error ? (
        <span role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>
          {state.error}
        </span>
      ) : null}
      <Submit />
    </form>
  );
}
