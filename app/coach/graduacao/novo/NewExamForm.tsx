"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createExamEvent } from "../actions";

const label: React.CSSProperties = { display: "block", fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 6 };
const toggleRow: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: "var(--text-sm)", cursor: "pointer" };
const hint: React.CSSProperties = { display: "block", color: "var(--text-secondary)", fontSize: "var(--text-xs)", marginTop: 2 };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "100%" }}>
      {pending ? "A criar…" : "Criar exame"}
    </button>
  );
}

export function NewExamForm({ modalities }: { modalities: { code: string; name: string; isPublished: boolean }[] }) {
  const [state, action] = useActionState(createExamEvent, null);
  const defaultModality = modalities.find((m) => m.isPublished)?.code ?? modalities[0]?.code;
  const [withSlots, setWithSlots] = useState(true);
  const [selfBooking, setSelfBooking] = useState(true);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("13:00");
  const [minutes, setMinutes] = useState(30);
  const [capacity, setCapacity] = useState(2);
  const slotCount = minutes > 0 ? Math.max(0, Math.floor((toMinutes(end) - toMinutes(start)) / minutes)) : 0;

  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <label style={label} htmlFor="modalityCode">
          Modalidade
        </label>
        <select id="modalityCode" name="modalityCode" className="input" defaultValue={defaultModality} required>
          {modalities.map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
              {m.isPublished ? "" : " (graduação em rascunho)"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={label} htmlFor="title">
          Nome do exame <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <input id="title" name="title" className="input" placeholder="ex.: Exame de graduação — Outubro" maxLength={120} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }}>
        <div>
          <label style={label} htmlFor="date">
            Data
          </label>
          <input id="date" name="date" type="date" className="input" required />
        </div>
        <div>
          <label style={label} htmlFor="time">
            {withSlots ? "Início" : "Hora"}
          </label>
          <input id="time" name="time" type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        {withSlots && (
          <div>
            <label style={label} htmlFor="endTime">
              Fim
            </label>
            <input id="endTime" name="endTime" type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
        )}
      </div>
      <label style={toggleRow}>
        <input type="checkbox" name="withSlots" checked={withSlots} onChange={(e) => setWithSlots(e.target.checked)} />
        <span>
          <strong>Dividir em horários</strong>
          <span style={hint}>Cada aluno tem um horário próprio dentro do período.</span>
        </span>
      </label>
      {withSlots && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }}>
            <div>
              <label style={label} htmlFor="slotMinutes">
                Duração do horário (min)
              </label>
              <input id="slotMinutes" name="slotMinutes" type="number" min={5} max={240} step={5} className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} required />
            </div>
            <div>
              <label style={label} htmlFor="slotCapacity">
                Vagas por horário
              </label>
              <input id="slotCapacity" name="slotCapacity" type="number" min={1} max={50} className="input" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {slotCount > 0 ? (
              <>
                {slotCount} {slotCount === 1 ? "horário" : "horários"} · <strong style={{ color: "var(--text-primary)" }}>{slotCount * (capacity || 0)} vagas</strong>
              </>
            ) : (
              "O período não chega para um horário completo."
            )}
          </p>
          <label style={toggleRow}>
            <input type="checkbox" name="selfBooking" checked={selfBooking} onChange={(e) => setSelfBooking(e.target.checked)} />
            <span>
              <strong>Marcação pelo aluno</strong>
              <span style={hint}>Os alunos aptos escolhem o horário na app (desmarcam até 48 h antes; marcações fecham 24 h antes).</span>
            </span>
          </label>
          {selfBooking && (
            <label style={toggleRow}>
              <input type="checkbox" name="notifyReady" defaultChecked />
              <span>
                <strong>Avisar os alunos aptos</strong>
                <span style={hint}>Notificação na app ao criar a agenda.</span>
              </span>
            </label>
          )}
        </>
      )}
      <div>
        <label style={label} htmlFor="revealDate">
          Resultados visíveis a partir de <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-3)" }}>
          <input id="revealDate" name="revealDate" type="date" className="input" aria-label="Data de revelação" />
          <input id="revealTime" name="revealTime" type="time" className="input" defaultValue="18:00" aria-label="Hora de revelação" />
        </div>
        <span style={hint}>
          Até lá, os alunos só veem «Exame feito». O grau, o XP e o ranking mudam todos nessa data. Deixa vazio para decidir mais tarde.
        </span>
      </div>
      <div>
        <label style={label} htmlFor="location">
          Local <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <input id="location" name="location" className="input" placeholder="ex.: Sede — tatame principal" maxLength={160} />
      </div>
      <div>
        <label style={label} htmlFor="notes">
          Notas para os alunos <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(opcional)</span>
        </label>
        <textarea id="notes" name="notes" className="input" rows={3} placeholder="ex.: Trazer luvas, caneleiras e protetor bucal." style={{ resize: "vertical" }} />
      </div>
      {state?.error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}
