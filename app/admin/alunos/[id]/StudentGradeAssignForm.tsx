"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStudentGrade } from "@/app/admin/graduacao/actions";

export type GradeOption = { id: string; name: string };
export type ModalityGradeBlock = {
  code: string;
  name: string;
  options: GradeOption[];
  currentGradeId: string | null;
  currentGradeName: string | null;
  currentSource: "EXAM" | "MIGRATION" | "MANUAL" | null;
  currentDate: string | null;
  currentNotes: string | null;
};

const SOURCE_LABEL = { EXAM: "exame", MIGRATION: "migração", MANUAL: "atribuído à mão" } as const;
const todayIso = () => new Date().toISOString().slice(0, 10);

function Block({ studentId, b }: { studentId: string; b: ModalityGradeBlock }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [gradeId, setGradeId] = useState(b.currentGradeId ?? "");
  const [date, setDate] = useState(b.currentDate ?? todayIso());
  const [origin, setOrigin] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const locked = b.currentSource === "EXAM";

  function save() {
    setMsg(null);
    start(async () => {
      const r = await setStudentGrade({ studentId, modalityCode: b.code, gradeId: gradeId || null, awardedDate: date, origin });
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: "Guardado." });
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 14 }}>{b.name}</strong>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          {b.currentGradeName ? (
            <>
              {b.currentGradeName}
              {b.currentSource ? ` · ${SOURCE_LABEL[b.currentSource]}` : ""}
              {b.currentDate ? ` · desde ${b.currentDate}` : ""}
            </>
          ) : (
            "Sem graduação"
          )}
        </span>
        {!locked && !open && (
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setOpen(true)}>
            {b.currentGradeName ? "Alterar grau" : "Atribuir grau"}
          </button>
        )}
      </div>
      {b.currentNotes && b.currentSource !== "EXAM" ? (
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{b.currentNotes}</span>
      ) : null}
      {locked && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Grau obtido em exame: não se altera aqui.</span>}

      {open && (
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Grau</span>
            <select className="input" value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
              <option value="">Sem graduação</option>
              {b.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Data em que obteve o grau</span>
            <input className="input" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 2, gridColumn: "1 / -1" }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Origem (escola / professor, opcional)</span>
            <input className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ex.: Academia X, Mestre Y" maxLength={200} />
          </label>
          <div style={{ display: "flex", gap: 8, gridColumn: "1 / -1" }}>
            <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={save} disabled={pending}>
              {pending ? "A guardar…" : "Guardar"}
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} style={{ margin: 0, fontSize: 12, color: msg.ok ? "var(--success)" : "var(--error)" }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

export function StudentGradeAssignForm({ studentId, blocks }: { studentId: string; blocks: ModalityGradeBlock[] }) {
  return (
    <section style={{ marginTop: 18 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
        Graduação
      </h2>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-secondary)" }}>
        Para alunos que já têm grau noutra escola: o tempo de treino conta a partir da data indicada e não começam do zero.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {blocks.map((b) => (
          <Block key={b.code} studentId={studentId} b={b} />
        ))}
      </div>
    </section>
  );
}
