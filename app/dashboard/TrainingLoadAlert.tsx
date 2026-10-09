import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { computeTrainingLoad, ZONE_COLORS, zoneLabel } from "@/lib/training-load";
import { loadTrainingSessions } from "@/lib/training-load.server";

/** Cartão da Home: só aparece com carga alta ou em atenção (o resto vive em Treino › Carga). */
export async function TrainingLoadAlert({ studentId, locale }: { studentId: string; locale: "pt" | "en" }) {
  const pt = locale !== "en";
  const supabase = await createClient();
  const today = calendarDateLisbon(new Date());
  const sessions = (await loadTrainingSessions(supabase, [studentId], today)).get(studentId) ?? [];
  const s = computeTrainingLoad(sessions, today);
  if ((s.zone !== "high" && s.zone !== "caution") || s.ratio == null) return null;

  const color = ZONE_COLORS[s.zone];
  const ratio = s.ratio.toFixed(2).replace(".", pt ? "," : ".");
  const hint =
    s.zone === "high"
      ? pt
        ? `${ratio}× o teu normal · hoje vai com calma`
        : `${ratio}× your normal · take it easy today`
      : pt
        ? `${ratio}× o teu normal · não subas mais esta semana`
        : `${ratio}× your normal · don't push further this week`;

  return (
    <Link
      href="/dashboard/treino/carga"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 18,
        border: `1px solid ${color}`,
        background: "var(--bg-secondary)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span aria-hidden style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 14, background: color, color: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertTriangle size={22} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>
          {zoneLabel(s.zone, pt)} {pt ? "esta semana" : "this week"}
        </span>
        <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{hint}</span>
      </span>
      <ChevronRight size={18} color="var(--text-secondary)" aria-hidden />
    </Link>
  );
}
