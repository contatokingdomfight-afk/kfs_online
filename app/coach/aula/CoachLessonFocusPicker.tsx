"use client";

import { useEffect, useRef, useState } from "react";
import { LESSON_FOCUS, LESSON_FOCUS_MAX, LESSON_FOCUS_META, lessonFocusLabel, type LessonFocus } from "@/lib/rpe-labels";
import { setLessonFocusAction } from "./actions";

/** «Foco da aula de hoje»: até 2 de Técnica, Tática, Sparring, Físico. Grava ao tocar. */
export function CoachLessonFocusPicker({ lessonId, occurrenceDate, initial }: { lessonId: string; occurrenceDate: string; initial: LessonFocus[] }) {
  const [focus, setFocus] = useState<LessonFocus[]>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Marca na hora; grava 400 ms depois do último toque (vários toques seguidos = um só pedido).
  const saved = useRef<LessonFocus[]>(initial);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const save = async (next: LessonFocus[]) => {
    const res = await setLessonFocusAction({ lessonId, occurrenceDate, focus: next });
    if (res.error) {
      setFocus(saved.current);
      setMsg({ ok: false, text: res.error });
      return;
    }
    saved.current = next;
    setMsg({ ok: true, text: next.length ? `✓ Guardado · os alunos veem «${lessonFocusLabel(next, true)}»` : "Sem foco marcado" });
  };

  const toggle = (f: LessonFocus) => {
    let next = focus.includes(f) ? focus.filter((x) => x !== f) : [...focus, f];
    if (next.length > LESSON_FOCUS_MAX) next = next.slice(next.length - LESSON_FOCUS_MAX);
    setFocus(next);
    setMsg(null);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(next), 400);
  };

  return (
    <section style={{ display: "grid", gap: 10, padding: 14, marginBottom: 12, borderRadius: 14, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
      <div>
        <strong style={{ display: "block", fontSize: 15 }}>Foco da aula</strong>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Até {LESSON_FOCUS_MAX}. Ajuda a perceber de onde vem o cansaço (ex.: semana tática).</span>
      </div>
      <div role="group" aria-label="Foco da aula" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
        {LESSON_FOCUS.map((f) => {
          const on = focus.includes(f);
          const meta = LESSON_FOCUS_META[f];
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(f)}
              style={{
                minHeight: 52,
                borderRadius: 12,
                border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
                background: on ? "var(--primary)" : "var(--bg)",
                color: on ? "#fff" : "var(--text-primary)",
                font: "inherit",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <span aria-hidden style={{ fontSize: 18 }}>{meta.icon}</span>
              {meta.pt}
            </button>
          );
        })}
      </div>
      {msg ? (
        <span role="status" style={{ fontSize: 12, fontWeight: 700, color: msg.ok ? "var(--success)" : "var(--danger)" }}>
          {msg.text}
        </span>
      ) : null}
    </section>
  );
}
