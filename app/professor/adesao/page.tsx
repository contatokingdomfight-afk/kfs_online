import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayYmdLisbon } from "@/lib/lisbon-payment-dates";
import { renderCoachAdhesionTerm, renderCoachContract, type ContractSection } from "@/lib/coach-contract";
import { getCurrentCoachOnboarding, loadCoachContractFields } from "@/lib/coach-onboarding";
import { CoachDataForm } from "./CoachDataForm";
import { CoachSignForm } from "./CoachSignForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ passo?: string }>;

function DocumentBox({ sections }: { sections: ContractSection[] }) {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "clamp(14px, 3.5vw, 18px)",
        maxHeight: 420,
        overflowY: "auto",
        fontSize: 13.5,
        lineHeight: 1.55,
      }}
    >
      {sections.map((s, i) => (
        <section key={i} style={{ marginBottom: 12 }}>
          {s.title && <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>{s.title}</h3>}
          {s.paragraphs.map((p, j) => (
            <p key={j} style={{ margin: "0 0 6px" }}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 }) {
  const items = ["Os teus dados", "Contrato e termo"];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {items.map((label, i) => {
        const n = i + 1;
        const color = n < current ? "var(--success, #34d399)" : n === current ? "var(--primary)" : "var(--border)";
        return (
          <div key={label} style={{ flex: 1, fontSize: 12, color: n === current ? "var(--text-primary)" : "var(--text-secondary)" }}>
            <div style={{ height: 4, borderRadius: 4, background: color, marginBottom: 5 }} />
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default async function CoachAdesaoPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "COACH") redirect("/dashboard");

  const state = await getCurrentCoachOnboarding(dbUser.id);
  if (!state) redirect("/dashboard?message=coach-access-revoked");
  if (state.complete) redirect("/coach");

  const { passo } = await searchParams;
  const pd = state.privateData;


  let body: React.ReactNode;
  if (!pd || passo === "dados") {
    body = (
      <>
        <Steps current={1} />
        <CoachDataForm
          defaults={{
            legalName: pd?.legalName ?? dbUser.name ?? "",
            nif: pd?.nif ?? "",
            idDocumentNumber: pd?.idDocumentNumber ?? "",
            address: pd?.address ?? "",
            iban: pd?.iban ?? "",
            tptdNumber: pd?.tptdNumber ?? "",
            tptdValidUntil: pd?.tptdValidUntil ?? "",
            selfEmployed: pd?.selfEmployed ?? false,
          }}
        />
      </>
    );
  } else {
    const schoolId = state.missingSchoolIds[0] ?? "";
    const db = createAdminClient();
    const fields = schoolId ? await loadCoachContractFields(db, state.coachId, schoolId, pd, todayYmdLisbon()) : null;
    body = (
      <>
        <Steps current={2} />
        {!fields ? (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ margin: 0 }}>
              A escola ainda não tem os dados legais preenchidos (nome legal, NIF e morada), por isso o contrato ainda não pode ser
              gerado. Fala com o Diretor Técnico.
            </p>
          </div>
        ) : (
          <>
            {state.missingSchoolIds.length > 1 && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                Dás aulas em {state.missingSchoolIds.length} escolas: assinas um contrato para cada uma. Agora: {fields.school.name}.
              </p>
            )}
            <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>2 · Contrato de prestação de serviços</h2>
              <DocumentBox sections={renderCoachContract(fields)} />
              <h2 style={{ margin: "8px 0 0", fontSize: 17, fontWeight: 600 }}>Termo de adesão</h2>
              <DocumentBox sections={renderCoachAdhesionTerm(fields)} />
            </div>
            <CoachSignForm schoolId={schoolId} />
          </>
        )}
        <Link href="/professor/adesao?passo=dados" style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          ← Corrigir os meus dados
        </Link>
      </>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-bg" style={{ color: "var(--text-primary)" }}>
      <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Adesão de professor</p>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Bem-vindo, {dbUser.name ?? "professor"}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            Antes de entrares na área do coach, preenche os teus dados e assina o contrato e o termo de adesão.
          </p>
        </div>
        {body}
      </div>
    </main>
  );
}
