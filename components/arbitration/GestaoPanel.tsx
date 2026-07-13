"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createArbitrationEvent,
  createArbitrationFight,
} from "@/app/coach/arbitragem/actions";
import type { ArbitrationEventRow, ArbitrationJudgeRow, ArbitrationModality } from "@/lib/arbitration/types";

type Props = {
  events: ArbitrationEventRow[];
  judges: ArbitrationJudgeRow[];
};

export function GestaoPanel({ events, judges }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const [fightEventId, setFightEventId] = useState(events[0]?.id ?? "");
  const [modality, setModality] = useState<ArbitrationModality>("BOXING");
  const [category, setCategory] = useState("");
  const [weightClass, setWeightClass] = useState("");
  const [athleteBlue, setAthleteBlue] = useState("");
  const [athleteRed, setAthleteRed] = useState("");
  const [totalRounds, setTotalRounds] = useState(3);
  const [selectedJudges, setSelectedJudges] = useState<string[]>([]);

  useEffect(() => {
    if (events.length === 0) {
      setFightEventId("");
      return;
    }
    setFightEventId((current) => {
      if (current && events.some((e) => e.id === current)) return current;
      return events[0]!.id;
    });
  }, [events]);

  const toggleJudge = (id: string) => {
    setSelectedJudges((prev) => {
      if (prev.includes(id)) return prev.filter((j) => j !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const createEvent = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const { id } = await createArbitrationEvent({
          name: eventName,
          eventDate: eventDate || null,
          location: eventLocation || null,
          totalRoundsDefault: 3,
        });
        setMessage("Evento criado.");
        setFightEventId(id);
        setEventName("");
        setEventDate("");
        setEventLocation("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      }
    });
  };

  const createFight = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const eventId = fightEventId || events[0]?.id;
        if (!eventId) throw new Error("Crie ou seleccione um evento primeiro.");
        const rounds = Number.isFinite(totalRounds) ? Math.min(12, Math.max(1, Math.round(totalRounds))) : 3;
        await createArbitrationFight({
          eventId,
          modality,
          category,
          weightClass: weightClass || null,
          athleteBlueName: athleteBlue,
          athleteRedName: athleteRed,
          totalRounds: rounds,
          judgeIds: selectedJudges,
        });
        setMessage("Combate criado. Vê a lista em Combates.");
        setCategory("");
        setWeightClass("");
        setAthleteBlue("");
        setAthleteRed("");
        setSelectedJudges([]);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {message ? <p style={{ color: "var(--success)" }}>{message}</p> : null}
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      <section className="arb-card">
        <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700 }}>Novo evento</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <input className="input" placeholder="Nome do evento" value={eventName} onChange={(e) => setEventName(e.target.value)} />
          <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          <input className="input" placeholder="Local" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={pending || !eventName.trim()} onClick={createEvent}>
            Criar evento
          </button>
        </div>
      </section>

      <section className="arb-card">
        <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>Juízes disponíveis</h2>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary)" }}>
          Todos os administradores, professores activos e assistentes de professor são juízes automaticamente.
        </p>
        {judges.length > 0 ? (
          <ul className="arb-staff-judges-list">
            {judges.map((j) => (
              <li key={j.id}>
                <span>{j.displayName}</span>
                {j.roleLabel ? <span className="arb-staff-judge-role">{j.roleLabel}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
            Nenhum membro do staff encontrado. Verifique utilizadores com papel Admin, Professor ou Assistente.
          </p>
        )}
      </section>

      <section className="arb-card">
        <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700 }}>Novo combate</h2>
        {events.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>Crie um evento primeiro.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <select className="input" value={fightEventId} onChange={(e) => setFightEventId(e.target.value)}>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
            <select className="input" value={modality} onChange={(e) => setModality(e.target.value as ArbitrationModality)}>
              <option value="BOXING">Boxe</option>
              <option value="MUAY_THAI">Muay Thai</option>
            </select>
            <input className="input" placeholder="Categoria (ex.: Sénior)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <input className="input" placeholder="Peso (ex.: -70 kg)" value={weightClass} onChange={(e) => setWeightClass(e.target.value)} />
            <input className="input" placeholder="Atleta Azul" value={athleteBlue} onChange={(e) => setAthleteBlue(e.target.value)} />
            <input className="input" placeholder="Atleta Vermelho" value={athleteRed} onChange={(e) => setAthleteRed(e.target.value)} />
            <input className="input" type="number" min={1} max={12} value={totalRounds} onChange={(e) => setTotalRounds(Number(e.target.value))} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Juízes (máx. 3)</div>
              <div className="arb-occurrences">
                {judges.map((j) => (
                  <label key={j.id} className="arb-occurrence-check">
                    <input
                      type="checkbox"
                      checked={selectedJudges.includes(j.id)}
                      onChange={() => toggleJudge(j.id)}
                    />
                    <span>
                      {j.displayName}
                      {j.roleLabel ? (
                        <span style={{ marginLeft: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                          ({j.roleLabel})
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending || events.length === 0 || !category.trim() || !athleteBlue.trim() || !athleteRed.trim()}
              onClick={createFight}
            >
              Criar combate
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
