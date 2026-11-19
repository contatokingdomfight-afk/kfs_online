"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { submitPainAction } from "@/app/dashboard/bem-estar/actions";
import { anatomicalBodyMapRegionLabels, type AnatomicalBodyMapRegionId } from "@/lib/anatomical-body-map-from-form";
import { PAIN_KEY_BY_SLUG, painRegionLabel, type BodyMark, type BodyMarkKey } from "@/lib/body-map/marks";
import type { BodySex } from "@/lib/body-map/measures";
import type { RegionStatus } from "@/lib/body-map/status";
import { rpeTone } from "@/components/training-load/RpeScaleExplainer";

/** Visão muscular: só é carregada quando o modal abre (os dados dos músculos são pesados). */
const MuscleBodyFigure = dynamic(() => import("@/components/physical-assessment/MuscleBodyFigure"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", borderRadius: 14, background: "rgba(255,255,255,.04)" }} aria-hidden />,
});

const ALL_REGIONS: AnatomicalBodyMapRegionId[] = ["head", "neck", "chest", "abdomen", "leftArm", "rightArm", "leftLeg", "rightLeg", "trapezius", "upperBack", "lowerBack", "glutes"];
/** No modal o corpo é neutro (sem cores de estado): só acendem as dores. */
const NEUTRAL = Object.fromEntries(ALL_REGIONS.map((r) => [r, "none"])) as Record<AnatomicalBodyMapRegionId, RegionStatus>;

export type RegisteredPain = { key: BodyMarkKey; side: "LEFT" | "RIGHT" | null; intensity: number };

type Props = {
  open: boolean;
  sex: BodySex;
  locale: "pt" | "en";
  /** Dores já registadas nesta sessão (ficam acesas no corpo). */
  previous: readonly RegisteredPain[];
  onClose: () => void;
  onSaved: (p: RegisteredPain) => void;
};

function intensityWord(n: number, pt: boolean): string {
  if (n <= 3) return pt ? "Ligeira" : "Mild";
  if (n <= 6) return pt ? "Moderada" : "Moderate";
  if (n <= 8) return pt ? "Forte" : "Strong";
  return pt ? "Muito forte" : "Very strong";
}

/**
 * «Onde dói?»: o aluno toca no músculo na Visão muscular (escolhe zona e lado de uma vez) e diz quanto dói.
 * Telemóvel: folha que sobe do fundo; desktop: diálogo ao centro. Grava em «Dores» (PainSelfReport).
 */
export function PainPickerModal({ open, sex, locale, previous, onClose, onSaved }: Props) {
  const pt = locale !== "en";
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"front" | "back">("front");
  const [sel, setSel] = useState<{ key: BodyMarkKey; side: "LEFT" | "RIGHT" | null } | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setView("front");
    setSel(null);
    setIntensity(null);
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const marks: BodyMark[] = [
    ...previous.map((p, i) => ({ id: `prev-${i}`, kind: "pain" as const, key: p.key, side: p.side, intensity: p.intensity, row: { label: "", value: "" } })),
    ...(sel ? [{ id: "sel", kind: "pain" as const, key: sel.key, side: sel.side, intensity: Math.max(intensity ?? 0, 7), row: { label: "", value: "" } }] : []),
  ];

  const pickFrom = (e: React.MouseEvent) => {
    const t = e.target as Element;
    const slug = t.closest("[data-slug]")?.getAttribute("data-slug") ?? "";
    const region = t.closest("[data-region]")?.getAttribute("data-region") ?? "";
    const key = PAIN_KEY_BY_SLUG[slug];
    if (!key) return;
    setSel({ key, side: region.startsWith("left") ? "LEFT" : region.startsWith("right") ? "RIGHT" : null });
    setError(null);
  };

  const save = () => {
    if (!sel || !intensity) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bodyRegion", sel.key);
      fd.set("intensity", String(intensity));
      if (sel.side) fd.set("side", sel.side);
      const res = await submitPainAction(null, fd);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onSaved({ key: sel.key, side: sel.side, intensity });
    });
  };

  const labels = anatomicalBodyMapRegionLabels(locale);
  const segBtn = (on: boolean): React.CSSProperties => ({
    border: 0,
    background: on ? "var(--text-primary)" : "none",
    color: on ? "var(--bg-primary, #111)" : "var(--text-secondary)",
    font: "inherit",
    fontSize: 13,
    fontWeight: 700,
    padding: "6px 16px",
    borderRadius: 999,
    cursor: "pointer",
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={pt ? "Onde dói?" : "Where does it hurt?"}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full flex-col gap-3 overflow-y-auto rounded-t-[22px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 pb-5 pt-3 sm:w-[440px] sm:rounded-[20px] sm:pt-4"
      >
        <div className="mx-auto h-[5px] w-[42px] rounded-full bg-[var(--border)] sm:hidden" aria-hidden />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{pt ? "Onde dói?" : "Where does it hurt?"}</span>
            <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)" }}>
              {pt ? "Toca no músculo." : "Tap the muscle."}{" "}
              {view === "front" ? (pt ? "Dói atrás? Vira o corpo." : "Hurts at the back? Turn the body.") : pt ? "Dói à frente? Vira o corpo." : "Hurts at the front? Turn the body."}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={pt ? "Fechar" : "Close"}
            style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 17, border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", display: "grid", placeItems: "center", cursor: "pointer" }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div role="group" aria-label={pt ? "Vista do corpo" : "Body view"} style={{ display: "inline-flex", padding: 3, borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg-primary)" }}>
            <button type="button" aria-pressed={view === "front"} onClick={() => setView("front")} style={segBtn(view === "front")}>
              {pt ? "Frente" : "Front"}
            </button>
            <button type="button" aria-pressed={view === "back"} onClick={() => setView("back")} style={segBtn(view === "back")}>
              {pt ? "Costas" : "Back"}
            </button>
          </div>
        </div>

        <div
          onClickCapture={pickFrom}
          style={{
            width: "100%",
            maxWidth: 300,
            margin: "0 auto",
            aspectRatio: "224 / 400",
            borderRadius: 16,
            border: "1px solid var(--border)",
            background: "radial-gradient(ellipse at 50% 40%, #1d222c 0%, #11141a 72%)",
            padding: 2,
          }}
        >
          <MuscleBodyFigure
            view={view}
            sex={sex}
            measures={{}}
            status={NEUTRAL}
            active={null}
            onPick={() => {}}
            onHover={() => {}}
            labels={labels}
            ariaLabel={pt ? "Toca no músculo onde dói" : "Tap the muscle that hurts"}
            marks={marks}
          />
        </div>

        {sel ? (
          <>
            <div style={{ textAlign: "center", fontSize: 14, padding: "8px 12px", borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.45)" }}>
              <b>{painRegionLabel(sel.key, locale)}</b>
              {sel.side ? <span> · {sel.side === "LEFT" ? (pt ? "lado esquerdo" : "left side") : pt ? "lado direito" : "right side"}</span> : null}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{pt ? "Quanto dói?" : "How much does it hurt?"}</span>
              {intensity ? <span style={{ fontSize: 12, fontWeight: 700, color: rpeTone(intensity) }}>{intensityWord(intensity, pt)}</span> : null}
            </div>
            <div role="radiogroup" aria-label={pt ? "Intensidade da dor" : "Pain intensity"} style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 4 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const on = intensity === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setIntensity(n)}
                    style={{
                      height: 38,
                      borderRadius: 9,
                      border: on ? "1px solid transparent" : "1px solid var(--border)",
                      background: on ? rpeTone(n) : "var(--bg-primary)",
                      color: on ? "#111" : "var(--text-primary)",
                      font: "inherit",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: "var(--text-secondary)" }}>
            {pt ? "O lado (esquerdo/direito) sai do sítio onde tocas." : "The side (left/right) comes from where you tap."}
          </p>
        )}

        {error ? <span style={{ fontSize: 13, color: "var(--danger)" }}>{error}</span> : null}
        <button
          type="button"
          onClick={save}
          disabled={!sel || !intensity || pending}
          style={{
            minHeight: 50,
            border: 0,
            borderRadius: 12,
            background: !sel || !intensity || pending ? "var(--border)" : "var(--primary)",
            color: !sel || !intensity || pending ? "var(--text-secondary)" : "#fff",
            font: "inherit",
            fontSize: 15,
            fontWeight: 800,
            cursor: !sel || !intensity || pending ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "…" : pt ? "Registar dor" : "Log pain"}
        </button>
      </div>
    </div>,
    document.body
  );
}
