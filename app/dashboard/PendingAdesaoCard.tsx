import Link from "next/link";
import { CheckCircle2, Circle, FileSignature, ArrowRight } from "lucide-react";
import type { MembershipDocumentsStatus } from "@/lib/membership-documents-status";

/** Cartão no topo da página inicial enquanto a adesão não estiver concluída. */
export function PendingAdesaoCard({
  status,
  locale,
}: {
  status: MembershipDocumentsStatus;
  locale: "pt" | "en";
}) {
  const pt = locale === "pt";
  const steps = [
    {
      done: status.enrollmentFormDone,
      label: pt ? "Comprovativo de adesão" : "Enrolment form",
      hint: pt ? "Os teus dados e contactos" : "Your details and contacts",
    },
    {
      done: status.agreementAndWaiverDone,
      label: pt ? "Contrato e termo de responsabilidade" : "Contract and liability waiver",
      hint: pt ? "Uma só assinatura para os dois" : "One signature for both",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const href = status.enrollmentFormDone ? "/adesao?passo=2" : "/adesao";

  return (
    <section
      aria-labelledby="pending-adesao-title"
      className="card"
      style={{
        padding: "clamp(18px, 4.5vw, 24px)",
        border: "2px solid var(--primary)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span
          aria-hidden
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: 14,
            backgroundColor: "var(--primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FileSignature size={24} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="pending-adesao-title" style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 21px)", fontWeight: 800 }}>
            {pt ? "Conclui a tua adesão" : "Finish your membership"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.45 }}>
            {pt
              ? "Falta pouco. Assim que terminares, ficas com acesso a tudo na app."
              : "Almost there. Once you finish, you get full access to the app."}
          </p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {doneCount}/{steps.length}
        </span>
      </div>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, i) => (
          <li
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 12,
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
            }}
          >
            {s.done ? (
              <CheckCircle2 size={22} color="var(--success)" aria-hidden />
            ) : (
              <Circle size={22} color="var(--text-secondary)" aria-hidden />
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>
                {i + 1}. {s.label}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {s.hint}
              </span>
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: s.done ? "var(--success)" : "var(--primary)",
                whiteSpace: "nowrap",
              }}
            >
              {s.done ? (pt ? "Feito" : "Done") : pt ? "Em falta" : "To do"}
            </span>
          </li>
        ))}
      </ol>

      <Link
        href={href}
        className="btn btn-primary"
        data-adesao-allowed
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 48,
          fontSize: 16,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        {doneCount === 0 ? (pt ? "Começar agora" : "Start now") : pt ? "Continuar" : "Continue"}
        <ArrowRight size={18} aria-hidden />
      </Link>
    </section>
  );
}
