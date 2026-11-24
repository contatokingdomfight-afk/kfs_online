"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { schoolOverrideLimits } from "@/lib/graduation/school-overrides";
import {
  createSchoolModality,
  deleteSchoolModality,
  proposeModalityToNetwork,
  renameSchoolModality,
  saveSchoolGradeOverrides,
  setSchoolModalityEnabled,
  type GradeOverrideInput,
} from "./config-actions";

export type ConfigNetworkModality = { code: string; name: string; enabled: boolean; lessons: number };
export type ConfigOwnModality = { code: string; name: string; proposed: boolean; lessons: number; gradeCount: number };
export type ConfigGrade = {
  id: string;
  name: string;
  colors: string[];
  net: { minMonths: number; minAttendances: number | null; minPerformanceAvg: number | null };
  school: { minMonths: number | null; minAttendances: number | null; minPerformanceAvg: number | null };
};
export type ConfigGraduation = { code: string; name: string; grades: ConfigGrade[] };

const muted: React.CSSProperties = { fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 };
const badge = (bg: string, fg: string): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: bg,
  color: fg,
  whiteSpace: "nowrap",
});
const NET = badge("color-mix(in srgb, var(--text-secondary) 18%, transparent)", "var(--text-secondary)");
const SCHOOL = badge("color-mix(in srgb, var(--primary) 18%, transparent)", "var(--primary)");

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string }>, okMsg?: string, after?: () => void) =>
    start(async () => {
      setError(null);
      setOk(null);
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        if (okMsg) setOk(okMsg);
        after?.();
        router.refresh();
      }
    });
  return { pending, error, ok, run };
}

function Switch({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        border: "none",
        flexShrink: 0,
        position: "relative",
        cursor: disabled ? "default" : "pointer",
        background: on ? "var(--primary)" : "var(--border)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

function ModalitiesCard({ schoolId, network, own }: { schoolId: string; network: ConfigNetworkModality[]; own: ConfigOwnModality[] }) {
  const { pending, error, run } = useAction();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ code: string; name: string } | null>(null);
  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg)",
  };
  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Modalidades oferecidas</h2>
      <p style={muted}>Só as ligadas aparecem nos horários, planos, aulas experimentais e graduações desta escola.</p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={NET}>🔒 Da rede</span>
        <span style={muted}>ligas ou desligas</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {network.map((m) => (
          <div key={m.code} style={rowStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {m.lessons > 0 ? `${m.lessons} aula${m.lessons === 1 ? "" : "s"}/semana` : m.enabled ? "sem aulas ainda" : "não oferecida"}
              </div>
            </div>
            <Switch
              on={m.enabled}
              disabled={pending}
              label={`${m.name}: ${m.enabled ? "desligar" : "ligar"}`}
              onChange={(v) => run(() => setSchoolModalityEnabled(schoolId, m.code, v))}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span style={SCHOOL}>✎ Desta escola</span>
        <span style={muted}>só os teus alunos e professores veem</span>
      </div>
      {own.length === 0 && <p style={muted}>Ainda não criaste modalidades próprias.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
        {own.map((m) => (
          <div key={m.code} style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", borderColor: "var(--primary)" }}>
            {editing?.code === m.code ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="input"
                  value={editing.name}
                  maxLength={40}
                  onChange={(e) => setEditing({ code: m.code, name: e.target.value })}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pending}
                  onClick={() => run(() => renameSchoolModality(schoolId, m.code, editing.name), undefined, () => setEditing(null))}
                >
                  Guardar
                </button>
              </div>
            ) : (
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
            )}
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {m.gradeCount > 0 ? `${m.gradeCount} graus próprios` : "sem graduação"} · {m.lessons} aula{m.lessons === 1 ? "" : "s"}/semana
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={badge("color-mix(in srgb, #f59e0b 18%, transparent)", "#b45309")}>Só ranking da escola</span>
              {m.proposed && <span style={SCHOOL}>Proposta à rede</span>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13 }}>
              <button type="button" className="link-button" onClick={() => setEditing({ code: m.code, name: m.name })} style={linkBtn}>
                Mudar nome
              </button>
              <Link href={`/admin/graduacao/${encodeURIComponent(m.code)}`} style={linkBtn}>
                Graus
              </Link>
              <button
                type="button"
                style={linkBtn}
                disabled={pending}
                onClick={() => run(() => proposeModalityToNetwork(schoolId, m.code, !m.proposed))}
              >
                {m.proposed ? "Retirar proposta" : "Propor à rede"}
              </button>
              {m.lessons === 0 && (
                <button
                  type="button"
                  style={{ ...linkBtn, color: "var(--danger)" }}
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`Apagar a modalidade ${m.name}?`)) run(() => deleteSchoolModality(schoolId, m.code));
                  }}
                >
                  Apagar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createSchoolModality(schoolId, newName), undefined, () => setNewName(""));
        }}
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}
      >
        <input
          className="input"
          placeholder="Nova modalidade (ex.: Jiu-Jitsu)"
          value={newName}
          maxLength={40}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 0 }}
        />
        <button type="submit" className="btn btn-primary" disabled={pending || newName.trim().length < 2}>
          + Criar
        </button>
      </form>
      <p style={{ ...muted, fontSize: 12 }}>
        As modalidades da escola funcionam como as da rede (horários, planos, experimentais, presenças, XP de presença). A graduação é opcional e
        conta só no ranking da escola. «Propor à rede»: o Admin Geral aprova e passa a ser da rede, mantendo alunos e graus.
      </p>
      {error && <p style={{ ...muted, color: "var(--danger)" }}>{error}</p>}
    </section>
  );
}

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--text-secondary)",
  textDecoration: "underline",
  cursor: "pointer",
  fontSize: 13,
};

type Draft = Record<string, { minMonths: string; minAttendances: string; minPerformanceAvg: string }>;

function draftFrom(grades: ConfigGrade[]): Draft {
  const s = (school: number | null, net: number | null) => String(school ?? net ?? "");
  return Object.fromEntries(
    grades.map((g) => [
      g.id,
      {
        minMonths: s(g.school.minMonths, g.net.minMonths),
        minAttendances: s(g.school.minAttendances, g.net.minAttendances),
        minPerformanceAvg: s(g.school.minPerformanceAvg, g.net.minPerformanceAvg),
      },
    ])
  );
}

function GraduationCard({ schoolId, graduations }: { schoolId: string; graduations: ConfigGraduation[] }) {
  const [code, setCode] = useState(graduations[0]?.code ?? "");
  const current = graduations.find((g) => g.code === code) ?? graduations[0];
  const [draft, setDraft] = useState<Draft>(() => (current ? draftFrom(current.grades) : {}));
  const { pending, error, ok, run } = useAction();

  const changedCount = useMemo(() => {
    if (!current) return 0;
    return current.grades.filter((g) => {
      const d = draft[g.id];
      if (!d) return false;
      return (
        Number(d.minMonths) !== g.net.minMonths ||
        (g.net.minAttendances != null && Number(d.minAttendances) !== g.net.minAttendances) ||
        (d.minPerformanceAvg !== "" && Number(d.minPerformanceAvg) !== (g.net.minPerformanceAvg ?? null))
      );
    }).length;
  }, [current, draft]);

  if (!current) {
    return (
      <section className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Graduação</h2>
        <p style={muted}>Nenhuma modalidade ligada nesta escola tem graduação publicada.</p>
      </section>
    );
  }

  const pick = (c: string) => {
    setCode(c);
    const g = graduations.find((x) => x.code === c);
    if (g) setDraft(draftFrom(g.grades));
  };
  const set = (id: string, field: keyof Draft[string], v: string) => setDraft((d) => ({ ...d, [id]: { ...d[id], [field]: v } }));
  const resetGrade = (g: ConfigGrade) =>
    setDraft((d) => ({
      ...d,
      [g.id]: { minMonths: String(g.net.minMonths), minAttendances: String(g.net.minAttendances ?? ""), minPerformanceAvg: String(g.net.minPerformanceAvg ?? "") },
    }));

  const save = () => {
    const rows: GradeOverrideInput[] = current.grades.map((g) => {
      const d = draft[g.id];
      const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
      return { gradeId: g.id, minMonths: n(d.minMonths), minAttendances: g.net.minAttendances == null ? null : n(d.minAttendances), minPerformanceAvg: n(d.minPerformanceAvg) };
    });
    run(() => saveSchoolGradeOverrides(schoolId, current.code, rows), "Guardado.");
  };

  const cell: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid var(--border)", verticalAlign: "top", fontSize: 13 };
  const input = (changed: boolean): React.CSSProperties => ({
    width: 72,
    padding: "6px 8px",
    borderRadius: 8,
    border: `1px solid ${changed ? "var(--primary)" : "var(--border)"}`,
    background: "var(--bg)",
    color: "var(--text-primary)",
    fontWeight: changed ? 700 : 400,
  });

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          Graduação {changedCount > 0 && <span style={SCHOOL}>{changedCount} ajuste{changedCount === 1 ? "" : "s"}</span>}
        </h2>
        {graduations.length > 1 && (
          <select className="input" value={current.code} onChange={(e) => pick(e.target.value)} style={{ width: "auto" }}>
            {graduations.map((g) => (
              <option key={g.code} value={g.code}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <p style={muted}>
        Graus, ordem, cores e XP são da rede 🔒. Ajustas o tempo e as presenças mínimas (até ±25 % do valor da rede) e só podes subir a nota
        mínima. Por baixo de cada valor vês o da rede.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-secondary)", fontSize: 12 }}>
              <th style={cell}>Grau</th>
              <th style={cell}>Tempo (meses)</th>
              <th style={cell}>Presenças</th>
              <th style={cell}>Nota mínima</th>
              <th style={cell} />
            </tr>
          </thead>
          <tbody>
            {current.grades.map((g) => {
              const d = draft[g.id];
              const lim = schoolOverrideLimits(g.net);
              const changedM = Number(d.minMonths) !== g.net.minMonths;
              const changedA = g.net.minAttendances != null && Number(d.minAttendances) !== g.net.minAttendances;
              const changedP = d.minPerformanceAvg !== "" && Number(d.minPerformanceAvg) !== g.net.minPerformanceAvg;
              return (
                <tr key={g.id}>
                  <td style={cell}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          background: g.colors.length > 1 ? `linear-gradient(90deg, ${g.colors.join(", ")})` : g.colors[0] ?? "var(--border)",
                          border: "1px solid var(--border)",
                        }}
                      />
                      {g.name}
                    </span>
                  </td>
                  <td style={cell}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={lim.minMonths.min}
                      max={lim.minMonths.max}
                      value={d.minMonths}
                      onChange={(e) => set(g.id, "minMonths", e.target.value)}
                      style={input(changedM)}
                      aria-label={`${g.name}: tempo em meses`}
                    />
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      rede {g.net.minMonths} · {lim.minMonths.min}–{lim.minMonths.max}
                    </div>
                  </td>
                  <td style={cell}>
                    {g.net.minAttendances == null || lim.minAttendances == null ? (
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>não exigido</span>
                    ) : (
                      <>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={lim.minAttendances.min}
                          max={lim.minAttendances.max}
                          value={d.minAttendances}
                          onChange={(e) => set(g.id, "minAttendances", e.target.value)}
                          style={input(changedA)}
                          aria-label={`${g.name}: presenças mínimas`}
                        />
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          rede {g.net.minAttendances} · {lim.minAttendances.min}–{lim.minAttendances.max}
                        </div>
                      </>
                    )}
                  </td>
                  <td style={cell}>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      min={lim.minPerformanceAvg.min}
                      max={5}
                      value={d.minPerformanceAvg}
                      placeholder="—"
                      onChange={(e) => set(g.id, "minPerformanceAvg", e.target.value)}
                      style={input(changedP)}
                      aria-label={`${g.name}: nota mínima`}
                    />
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>rede {g.net.minPerformanceAvg ?? "—"} · só sobe</div>
                  </td>
                  <td style={cell}>
                    {(changedM || changedA || changedP) && (
                      <button type="button" style={linkBtn} onClick={() => resetGrade(g)}>
                        Repor rede
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>
          {pending ? "A guardar…" : "Guardar graduação"}
        </button>
        {ok && <span style={{ fontSize: 13, color: "var(--success, #16a34a)" }}>{ok}</span>}
        {error && <span style={{ fontSize: 13, color: "var(--danger)" }}>{error}</span>}
      </div>
    </section>
  );
}

/** Separador «Configuração» da escola — fase 1: modalidades e graduação. */
export function SchoolConfigPanel({
  schoolId,
  network,
  own,
  graduations,
}: {
  schoolId: string;
  network: ConfigNetworkModality[];
  own: ConfigOwnModality[];
  graduations: ConfigGraduation[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={muted}>
        O que vem da rede <span style={NET}>🔒 Rede</span> fica igual em todas as escolas. Ajustas só o que tem{" "}
        <span style={SCHOOL}>✎ Escola</span>.
      </p>
      <ModalitiesCard schoolId={schoolId} network={network} own={own} />
      <GraduationCard key={graduations.map((g) => g.code).join(",")} schoolId={schoolId} graduations={graduations} />
    </div>
  );
}
