"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { modalityLabel } from "@/lib/arbitration/scoring";
import type { ArbitrationFightListRow } from "@/lib/arbitration/types";
import type { ArbitrationEventRow, ArbitrationJudgeRow } from "@/lib/arbitration/types";

type Props = {
  fights: ArbitrationFightListRow[];
  events: ArbitrationEventRow[];
  judges: ArbitrationJudgeRow[];
};

export function HistoryPanel({ fights, events, judges }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventId = searchParams.get("evento") ?? "";
  const modality = searchParams.get("modalidade") ?? "";
  const date = searchParams.get("data") ?? "";
  const athlete = searchParams.get("atleta") ?? "";
  const judgeId = searchParams.get("juiz") ?? "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/coach/arbitragem/historico?${params.toString()}`);
  };

  const filtered = fights;

  return (
    <div>
      <div className="arb-card" style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          <select className="input" value={eventId} onChange={(e) => updateFilter("evento", e.target.value)}>
            <option value="">Todos os eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          <select className="input" value={modality} onChange={(e) => updateFilter("modalidade", e.target.value)}>
            <option value="">Modalidade</option>
            <option value="BOXING">Boxe</option>
            <option value="MUAY_THAI">Muay Thai</option>
          </select>
          <input className="input" type="date" value={date} onChange={(e) => updateFilter("data", e.target.value)} />
          <input className="input" placeholder="Atleta" value={athlete} onChange={(e) => updateFilter("atleta", e.target.value)} />
          <select className="input" value={judgeId} onChange={(e) => updateFilter("juiz", e.target.value)}>
            <option value="">Juiz</option>
            {judges.map((j) => (
              <option key={j.id} value={j.id}>{j.displayName}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="arb-empty">Nenhum combate encontrado.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((f) => (
            <Link
              key={f.id}
              href={`/coach/arbitragem/${f.id}`}
              className="arb-card"
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {f.eventName} · {modalityLabel(f.modality)}
              </div>
              <div style={{ fontWeight: 700, marginTop: 6 }}>
                <span className="arb-corner-blue">{f.athleteBlueName}</span>
                {" vs "}
                <span className="arb-corner-red">{f.athleteRedName}</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 4, color: "var(--text-secondary)" }}>
                {f.category}{f.weightClass ? ` · ${f.weightClass}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
