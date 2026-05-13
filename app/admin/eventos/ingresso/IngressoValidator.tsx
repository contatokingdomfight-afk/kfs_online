"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemEventTicket } from "../actions";

export type IngressoPreview = {
  eventName: string;
  studentName: string;
  alreadyUsed: boolean;
  status: string;
};

type Props = {
  token: string;
  preview: IngressoPreview | null;
  invalidToken: boolean;
  notAdmin: boolean;
};

export function IngressoValidator({ token, preview, invalidToken, notAdmin }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (notAdmin) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>Apenas administradores podem validar ingressos.</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: 20, fontWeight: 600 }}>Validar ingresso</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Abre esta página a partir do link do QR (ou cola o URL com o parâmetro <code>token</code> na barra de endereços).
        </p>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <p style={{ margin: 0, color: "var(--danger)" }}>Código de ingresso inválido.</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 480 }}>
        <p style={{ margin: 0, color: "var(--danger)" }}>Ingresso não encontrado.</p>
      </div>
    );
  }

  if (preview.status !== "CONFIRMED") {
    return (
      <div className="card" style={{ padding: 24, maxWidth: 520 }}>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>Esta inscrição ainda não está confirmada. Confirma primeiro na página do evento.</p>
      </div>
    );
  }

  async function onRedeem() {
    setMsg(null);
    setPending(true);
    const res = await redeemEventTicket(token);
    setPending(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: "clamp(20px, 5vw, 28px)", maxWidth: 480 }}>
      <h1 style={{ margin: "0 0 16px 0", fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 600 }}>Validar ingresso</h1>
      <p style={{ margin: "0 0 8px 0", fontSize: 15, color: "var(--text-primary)" }}>
        <strong>Evento:</strong> {preview.eventName}
      </p>
      <p style={{ margin: "0 0 20px 0", fontSize: 15, color: "var(--text-primary)" }}>
        <strong>Aluno:</strong> {preview.studentName}
      </p>

      {preview.alreadyUsed ? (
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>Este ingresso já foi utilizado.</p>
      ) : done ? (
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>Entrada registada com sucesso.</p>
      ) : (
        <>
          <button type="button" className="btn btn-primary" style={{ width: "100%", minHeight: 44 }} disabled={pending} onClick={onRedeem}>
            {pending ? "A registar…" : "Registar entrada"}
          </button>
          <p style={{ margin: "12px 0 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>
            Ao confirmar, o ingresso fica marcado como utilizado e não pode ser usado outra vez.
          </p>
        </>
      )}

      {msg && (
        <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14, color: "var(--danger)" }} role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
