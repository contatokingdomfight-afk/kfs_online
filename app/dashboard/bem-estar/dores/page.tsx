import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { redirect } from "next/navigation";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { PainForm } from "./PainForm";
import { InjuryForm } from "./InjuryForm";
import { deleteInjuryAction } from "../actions";
import { PAIN_REGIONS } from "@/lib/pain-regions";
import { BODY_SIDES, INJURY_TYPES } from "@/lib/body-map/marks";

export const metadata = {
  title: "Dores | PM Team",
};

export default async function DoresPage() {
  const studentId = await getCurrentStudentId();
  if (!studentId) redirect("/sign-in");

  const locale = await getLocaleFromCookies();
  const loc = locale === "en" ? "en" : "pt";

  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("PainSelfReport")
    .select("id, bodyRegion, side, intensity, notes, reportedAt, createdAt")
    .eq("studentId", studentId)
    .order("reportedAt", { ascending: false })
    .limit(60);
  const { data: injuryRows } = await supabase
    .from("StudentInjury")
    .select("id, bodyRegion, side, injuryType, occurredYear, recovered, notes")
    .eq("studentId", studentId)
    .order("createdAt", { ascending: false })
    .limit(50);
  const injuries = (injuryRows ?? []) as Array<{
    id: string;
    bodyRegion: string;
    side: string | null;
    injuryType: string;
    occurredYear: number | null;
    recovered: boolean;
    notes: string | null;
  }>;
  const sideLabel = (s: string | null) => {
    const f = BODY_SIDES.find((x) => x.key === s);
    return f ? (loc === "pt" ? f.pt : f.en).toLowerCase() : "";
  };
  const injuryLabel = (k: string) => {
    const f = INJURY_TYPES.find((x) => x.key === k);
    return f ? (loc === "pt" ? f.pt : f.en) : k;
  };

  const list = (reports ?? []) as Array<{
    id: string;
    bodyRegion: string;
    intensity: number;
    notes: string | null;
    reportedAt: string;
    side?: string | null;
  }>;

  const labelFor = (key: string) =>
    PAIN_REGIONS.find((r) => r.key === key)?.[loc === "pt" ? "labelPt" : "labelEn"] ?? key;

  const chart = [...list]
    .filter((r) => r.reportedAt)
    .slice(0, 21)
    .reverse();
  const maxI = Math.max(10, ...chart.map((c) => c.intensity));

  return (
    <>
      <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", marginBottom: 8, color: "var(--text-primary)" }}>
        {loc === "pt" ? "Dores e desconfortos" : "Pain & discomfort"}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
        {loc === "pt"
          ? "Registo rápido para acompanhares padrões com o teu coach. Não substitui avaliação médica."
          : "Quick log to track patterns with your coach. Not a substitute for medical advice."}
      </p>

      <PainForm locale={loc} />

      {chart.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: "clamp(16px, 4vw, 18px)", marginBottom: 12, color: "var(--text-primary)" }}>
            {loc === "pt" ? "Últimos registos (intensidade)" : "Recent entries (intensity)"}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
              height: 100,
              padding: "8px 0",
            }}
          >
            {chart.map((r) => (
              <div
                key={r.id}
                title={`${labelFor(r.bodyRegion)} · ${r.intensity}`}
                style={{
                  flex: 1,
                  minWidth: 8,
                  background: "var(--accent, #ED1C24)",
                  height: `${(r.intensity / maxI) * 100}%`,
                  minHeight: 4,
                  borderRadius: 2,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {list.length > 0 && (
        <ul style={{ marginTop: 24, padding: 0, listStyle: "none" }}>
          {list.map((r) => (
            <li
              key={r.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                color: "var(--text-secondary)",
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>{labelFor(r.bodyRegion)}</strong>
              {sideLabel(r.side ?? null) ? ` (${sideLabel(r.side ?? null)})` : ""} · {r.intensity}/10 ·{" "}
              {String(r.reportedAt).slice(0, 10)}
              {r.notes ? ` — ${r.notes}` : ""}
            </li>
          ))}
        </ul>
      )}

      <section style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: "clamp(18px, 4.5vw, 22px)", marginBottom: 8, color: "var(--text-primary)" }}>
          {loc === "pt" ? "Lesões anteriores" : "Past injuries"}
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
          {loc === "pt"
            ? "Já tiveste alguma fratura, entorse ou distensão? Regista-a para aparecer no teu mapa corporal e o teu coach saber."
            : "Ever had a fracture, sprain or strain? Log it so it shows on your body map and your coach knows."}
        </p>
        <InjuryForm locale={loc} />
        {injuries.length > 0 && (
          <ul style={{ marginTop: 20, padding: 0, listStyle: "none" }}>
            {injuries.map((inj) => (
              <li
                key={inj.id}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  color: "var(--text-secondary)",
                }}
              >
                <span>
                  <strong style={{ color: "var(--text-primary)" }}>{injuryLabel(inj.injuryType)}</strong> · {labelFor(inj.bodyRegion)}
                  {sideLabel(inj.side) ? ` (${sideLabel(inj.side)})` : ""}
                  {inj.occurredYear ? ` · ${inj.occurredYear}` : ""} ·{" "}
                  {inj.recovered ? (loc === "pt" ? "recuperada" : "recovered") : loc === "pt" ? "por recuperar" : "not recovered"}
                  {inj.notes ? ` — ${inj.notes}` : ""}
                </span>
                <form action={deleteInjuryAction}>
                  <input type="hidden" name="id" value={inj.id} />
                  <button type="submit" className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 13 }}>
                    {loc === "pt" ? "Apagar" : "Delete"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
