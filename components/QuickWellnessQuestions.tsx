"use client";

import { useState, type ReactNode } from "react";
import { BatteryFull, BatteryLow, BatteryMedium, Brain, CloudLightning, Moon, Smile, Sun } from "lucide-react";
import { QUICK_BODY, QUICK_MIND, QUICK_SLEEP, type QuickWellnessAnswers } from "@/lib/wellness-score";

type Props = {
  locale: "pt" | "en";
  /** Avisa o formulário de quantas perguntas já têm resposta (0–3). */
  onAnsweredChange?: (answered: number) => void;
};

const ICONS: Record<string, ReactNode> = {
  tired: <BatteryLow size={18} aria-hidden />,
  "body-normal": <BatteryMedium size={18} aria-hidden />,
  fresh: <BatteryFull size={18} aria-hidden />,
  stressed: <CloudLightning size={18} aria-hidden />,
  "mind-normal": <Brain size={18} aria-hidden />,
  calm: <Sun size={18} aria-hidden />,
};

function ChipRow({
  name,
  legend,
  icon,
  options,
  value,
  onPick,
}: {
  name: string;
  legend: string;
  icon: ReactNode;
  options: { key: string; label: string; iconKey?: string }[];
  value: string | null;
  onPick: (key: string) => void;
}) {
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <legend style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, marginBottom: 8, padding: 0 }}>
        <span aria-hidden style={{ color: "var(--text-secondary)", display: "inline-flex" }}>
          {icon}
        </span>
        {legend}
      </legend>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 6 }}>
        {options.map((o) => {
          const active = value === o.key;
          return (
            <label
              key={o.key}
              style={{
                minHeight: 46,
                borderRadius: 12,
                border: active ? "2px solid var(--primary)" : "1px solid var(--border)",
                background: active ? "rgba(193,18,31,0.14)" : "var(--bg)",
                color: "var(--text-primary)",
                display: "flex",
                flexDirection: o.iconKey ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "center",
                padding: "4px 2px",
              }}
            >
              <input type="radio" name={name} value={o.key} checked={active} onChange={() => onPick(o.key)} className="sr-only" />
              {o.iconKey ? ICONS[o.iconKey] : null}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** As 3 perguntas rápidas de bem-estar (campos `wSleep`, `wBody`, `wMind`), um toque cada. */
export function QuickWellnessQuestions({ locale, onAnsweredChange }: Props) {
  const pt = locale !== "en";
  const [a, setA] = useState<QuickWellnessAnswers>({});
  const pick = (field: keyof QuickWellnessAnswers) => (key: string) => {
    const next = { ...a, [field]: key };
    setA(next);
    onAnsweredChange?.([next.sleep, next.body, next.mind].filter(Boolean).length);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ChipRow
        name="wSleep"
        legend={pt ? "Quantas horas dormiste?" : "How many hours did you sleep?"}
        icon={<Moon size={18} />}
        options={QUICK_SLEEP.map((o) => ({ key: o.key, label: pt ? o.pt : o.en }))}
        value={a.sleep ?? null}
        onPick={pick("sleep")}
      />
      <ChipRow
        name="wBody"
        legend={pt ? "Como está o corpo?" : "How does your body feel?"}
        icon={<BatteryMedium size={18} />}
        options={QUICK_BODY.map((o) => ({ key: o.key, label: pt ? o.pt : o.en, iconKey: o.key === "normal" ? "body-normal" : o.key }))}
        value={a.body ?? null}
        onPick={pick("body")}
      />
      <ChipRow
        name="wMind"
        legend={pt ? "E a cabeça?" : "And your mind?"}
        icon={<Smile size={18} />}
        options={QUICK_MIND.map((o) => ({ key: o.key, label: pt ? o.pt : o.en, iconKey: o.key === "normal" ? "mind-normal" : o.key }))}
        value={a.mind ?? null}
        onPick={pick("mind")}
      />
    </div>
  );
}
