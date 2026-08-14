"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Avatar } from "@/components/avatar/Avatar";
import type { Modality } from "@/components/avatar/avatar-utils";
import type { AvatarCosmeticConfig, CosmeticOptionWithStatus } from "@/lib/avatar-cosmetics";
import { saveAvatarConfig, type SaveAvatarConfigResult } from "./avatar-actions";

type Props = {
  options: CosmeticOptionWithStatus[];
  initialConfig: AvatarCosmeticConfig;
  beltColor: string;
  modality: Modality;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "A guardar…" : "Guardar avatar"}
    </button>
  );
}

function OptionGroup({
  label,
  opts,
  value,
  onChange,
}: {
  label: string;
  opts: CosmeticOptionWithStatus[];
  value: string;
  onChange: (id: string) => void;
}) {
  const locked = opts.filter((o) => !o.isUnlocked);
  return (
    <div>
      <p style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {opts.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={!o.isUnlocked}
              onClick={() => onChange(o.id)}
              title={!o.isUnlocked ? (o.unlockHint ?? undefined) : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                backgroundColor: active ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "var(--bg-secondary)",
                color: o.isUnlocked ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: o.isUnlocked ? "pointer" : "not-allowed",
                opacity: o.isUnlocked ? 1 : 0.6,
              }}
            >
              <span aria-hidden>{o.isUnlocked ? o.icon : "🔒"}</span>
              <span>{o.name}</span>
            </button>
          );
        })}
      </div>
      {locked.length > 0 && (
        <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
          {locked.map((o) => `${o.name}: ${o.unlockHint}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

/** Personalização do avatar de gamificação (cor de equipamento, bandana, faixa visível). */
export function AvatarCustomizer({ options, initialConfig, beltColor, modality }: Props) {
  const [state, formAction] = useFormState(saveAvatarConfig, null as SaveAvatarConfigResult | null);
  const [gearColor, setGearColor] = useState(initialConfig.gearColor);
  const [headband, setHeadband] = useState(initialConfig.headband);
  const [showBeltSash, setShowBeltSash] = useState(initialConfig.showBeltSash);

  const gearOptions = useMemo(() => options.filter((o) => o.slot === "gearColor"), [options]);
  const headbandOptions = useMemo(() => options.filter((o) => o.slot === "headband"), [options]);

  return (
    <section
      className="card"
      style={{
        padding: "clamp(16px, 4vw, 20px)",
        marginBottom: "clamp(20px, 5vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 4px 0", fontSize: "clamp(17px, 4.2vw, 19px)", fontWeight: 600, color: "var(--text-primary)" }}>
          🥋 Personalizar avatar
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
          Algumas peças desbloqueiam conforme sobes de faixa ou ganhas XP.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Avatar
          modality={modality}
          avatarConfig={{ gearColor, headband, showBeltSash }}
          beltColor={beltColor}
          className="w-full max-w-[180px]"
        />
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="gearColor" value={gearColor} />
        <input type="hidden" name="headband" value={headband} />
        <input type="hidden" name="showBeltSash" value={showBeltSash ? "on" : ""} />

        <OptionGroup label="Cor do equipamento" opts={gearOptions} value={gearColor} onChange={setGearColor} />
        <OptionGroup label="Bandana" opts={headbandOptions} value={headband} onChange={setHeadband} />

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={showBeltSash} onChange={(e) => setShowBeltSash(e.target.checked)} />
          Mostrar faixa no avatar
        </label>

        {state?.error && (
          <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: 14 }}>
            {state.error}
          </p>
        )}
        {state?.success && (
          <p role="status" style={{ margin: 0, color: "var(--success)", fontSize: 14 }}>
            Avatar guardado!
          </p>
        )}

        <SubmitButton />
      </form>
    </section>
  );
}
