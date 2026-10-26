"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CalendarPlus, Lock, MapPin } from "lucide-react";
import { bookExamSlot, cancelExamBooking } from "./actions";

export type BookingEvent = {
  id: string;
  title: string;
  scheduledAt: string;
  endsAt: string;
  slotMinutes: number;
  location: string | null;
  notes: string | null;
  /** free = vagas livres (sem contar a do próprio aluno); open = ainda aceita marcações (até 2 h antes). */
  slots: { iso: string; free: number; open: boolean }[];
};

export type MyBooking = {
  candidateId: string;
  eventId: string;
  slotStartsAt: string | null;
  bookedByStudent: boolean;
  canChange: boolean;
  deadline: string;
};

const TZ = "Europe/Lisbon";
const card = "rounded-2xl border border-border bg-bg-secondary p-4 sm:p-5";

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const day = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", timeZone: TZ });
const month = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { month: "short", timeZone: TZ }).replace(".", "");
const weekday = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { weekday: "long", timeZone: TZ });
const longDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-PT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const sameSlot = (a: string | null, b: string | null) => !!a && !!b && new Date(a).getTime() === new Date(b).getTime();

function googleCalendarUrl(event: BookingEvent, slotIso: string, gradeName: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(slotIso);
  const end = new Date(start.getTime() + event.slotMinutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Exame de graduação — ${gradeName}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: event.title,
    ...(event.location ? { location: event.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function BookingPicker({
  events,
  myBooking,
  canBook,
  gradeName,
}: {
  events: BookingEvent[];
  myBooking: MyBooking | null;
  canBook: boolean;
  gradeName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  // Começa no dia da marcação atual, se ainda aceitar marcações; senão no primeiro dia aberto.
  const [eventId, setEventId] = useState(() => {
    const hasOpen = (e?: BookingEvent) => !!e && e.slots.some((s) => s.open);
    const current = events.find((e) => e.id === myBooking?.eventId);
    return (hasOpen(current) ? current : events.find((e) => hasOpen(e)) ?? current ?? events[0])?.id ?? "";
  });
  const [slot, setSlot] = useState<string | null>(null);

  const bookedEvent = myBooking ? events.find((e) => e.id === myBooking.eventId) ?? null : null;
  const event = events.find((e) => e.id === eventId) ?? events[0];

  const selectable = canBook || !!myBooking;

  const confirm = () => {
    if (!slot || !event) return;
    setError(null);
    start(async () => {
      const r = await bookExamSlot(event.id, slot);
      if (r.error) {
        setError(r.error);
        router.refresh();
        return;
      }
      setChanging(false);
      setSlot(null);
      router.refresh();
    });
  };

  const cancel = () => {
    if (!myBooking || !window.confirm("Desmarcar o teu exame? A vaga fica livre para outro aluno.")) return;
    setError(null);
    start(async () => {
      const r = await cancelExamBooking(myBooking.candidateId);
      if (r.error) setError(r.error);
      router.refresh();
    });
  };

  if (myBooking?.slotStartsAt && bookedEvent && !changing) {
    return (
      <section
        className={`${card} mt-4`}
        style={{ borderColor: "color-mix(in srgb, var(--success) 40%, transparent)", background: "color-mix(in srgb, var(--success) 6%, var(--bg-secondary))" }}
      >
        <span className="rounded-full px-2.5 py-1 text-xs font-bold text-success" style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)" }}>
          ✓ Confirmado
        </span>
        <p className="m-0 mt-3 text-2xl font-extrabold capitalize text-text-primary">{longDate(myBooking.slotStartsAt)}</p>
        <p className="m-0 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
          <span>{bookedEvent.title}</span>
          {bookedEvent.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} aria-hidden /> {bookedEvent.location}
            </span>
          )}
        </p>
        {bookedEvent.notes && <p className="m-0 mt-2 whitespace-pre-line text-sm text-text-primary">{bookedEvent.notes}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {myBooking.canChange && (
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setChanging(true)}>
              Trocar horário
            </button>
          )}
          {myBooking.canChange && myBooking.bookedByStudent && (
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={cancel}>
              {pending ? "A desmarcar…" : "Desmarcar"}
            </button>
          )}
          <a
            href={googleCalendarUrl(bookedEvent, myBooking.slotStartsAt, gradeName)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary inline-flex items-center gap-1 no-underline"
          >
            <CalendarPlus size={16} aria-hidden /> Adicionar ao calendário
          </a>
        </div>
        <p className="m-0 mt-3 text-xs text-text-secondary">
          {myBooking.canChange
            ? `Podes trocar${myBooking.bookedByStudent ? " ou desmarcar" : ""} até ${longDate(myBooking.deadline)}. Depois disso fala com o coach — se faltares conta como «Faltou».`
            : "Já não é possível trocar pela app. Se não puderes ir, fala com o coach — se faltares conta como «Faltou»."}
        </p>
        {error && (
          <p role="alert" className="m-0 mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </section>
    );
  }

  const visibleEvents = events;

  return (
    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
      <section className={card} aria-labelledby="dia-exame">
        <h2 id="dia-exame" className="m-0 mb-3 text-sm font-bold text-text-primary">
          1 · Dia do exame
        </h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {visibleEvents.map((e) => {
            const open = e.slots.some((s) => s.open);
            const free = e.slots.filter((s) => s.open).reduce((n, s) => n + s.free, 0);
            const active = e.id === event?.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setEventId(e.id);
                    setSlot(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border bg-bg p-3 text-left"
                  style={{
                    borderColor: active ? "var(--primary)" : "var(--border)",
                    background: active ? "color-mix(in srgb, var(--primary) 8%, var(--bg))" : undefined,
                  }}
                  aria-pressed={active}
                >
                  <span className="w-12 shrink-0 rounded-lg bg-bg-secondary py-1.5 text-center">
                    <b className="block text-lg leading-tight text-text-primary">{day(e.scheduledAt)}</b>
                    <small className="text-[10px] font-bold uppercase text-text-secondary">{month(e.scheduledAt)}</small>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold capitalize text-text-primary">
                      {weekday(e.scheduledAt)} · {time(e.scheduledAt)}–{time(e.endsAt)}
                    </span>
                    <span className="block truncate text-xs text-text-secondary">{e.location ?? e.title}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-bold text-text-secondary">
                    {selectable ? (!open ? "Marcações fechadas" : free > 0 ? `${free} ${free === 1 ? "vaga" : "vagas"}` : "Esgotado") : <Lock size={12} aria-label="Bloqueado" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {event && (
        <section className={card} aria-labelledby="horario-exame">
          <h2 id="horario-exame" className="m-0 mb-3 text-sm font-bold text-text-primary">
            2 · Horário <span className="font-normal text-text-secondary">· {event.slotMinutes} min</span>
          </h2>
          {!selectable ? (
            <p className="m-0 text-sm text-text-secondary">
              A marcação abre quando cumprires os requisitos acima. Mantém o ritmo de treinos!
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {event.slots.map((s) => {
                  const mineHere = sameSlot(myBooking?.slotStartsAt ?? null, s.iso);
                  const disabled = !s.open || (s.free === 0 && !mineHere);
                  const active = slot === s.iso;
                  return (
                    <button
                      key={s.iso}
                      type="button"
                      disabled={disabled || mineHere}
                      onClick={() => setSlot(s.iso)}
                      className="rounded-xl border px-1 py-2 text-center disabled:cursor-not-allowed"
                      style={{
                        borderColor: active || mineHere ? "var(--primary)" : "var(--border)",
                        background: active ? "var(--primary)" : "var(--bg)",
                        opacity: disabled && !mineHere ? 0.35 : 1,
                      }}
                    >
                      <b className="block text-sm text-text-primary">{time(s.iso)}</b>
                      <small className="text-[11px]" style={{ color: active ? "#fff" : s.free === 1 ? "var(--warning)" : "var(--text-secondary)" }}>
                        {mineHere ? "O teu" : !s.open ? "Fechado" : s.free === 0 ? "Esgotado" : s.free === 1 ? "1 vaga" : `${s.free} vagas`}
                      </small>
                    </button>
                  );
                })}
              </div>
              {(event.location || event.notes) && (
                <p className="m-0 mt-3 flex gap-1 whitespace-pre-line rounded-xl border border-dashed border-border p-3 text-xs text-text-secondary">
                  <MapPin size={14} aria-hidden className="mt-0.5 shrink-0" />
                  <span>{[event.location, event.notes].filter(Boolean).join(" · ")}</span>
                </p>
              )}
              <button type="button" className="btn btn-primary mt-3 w-full" disabled={!slot || pending} onClick={confirm}>
                <CalendarDays size={16} aria-hidden />{" "}
                {pending ? "A marcar…" : slot ? `Confirmar · ${day(slot)} ${month(slot)}, ${time(slot)}` : "Escolhe um horário"}
              </button>
              {changing && (
                <button type="button" className="btn btn-secondary mt-2 w-full" disabled={pending} onClick={() => setChanging(false)}>
                  Manter o horário atual
                </button>
              )}
              <p className="m-0 mt-2 text-center text-xs text-text-secondary">Podes trocar ou desmarcar até 48 h antes.</p>
              {error && (
                <p role="alert" className="m-0 mt-2 text-sm text-danger">
                  {error}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
