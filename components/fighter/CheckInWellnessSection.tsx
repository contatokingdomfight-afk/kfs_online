import type { ReactNode } from "react";
import type { CheckInWellnessAggregates } from "@/lib/check-in-wellness-aggregates";

export type CheckInWellnessCopy = {
  title: string;
  intro: string;
  sample: string;
  sleepH: string;
  sleepQ: string;
  hydration: string;
  stress: string;
  fatigue: string;
  scaleHint: string;
  hydrationHint: string;
  zonesTitle: string;
  zoneGreen: string;
  zoneYellow: string;
  zoneRed: string;
  statusNormal: string;
  statusAttention: string;
  statusLower: string;
  statusHigher: string;
  abbrSleepH: string;
  abbrSleepQ: string;
  abbrHydration: string;
  abbrStress: string;
  abbrFatigue: string;
  /** Subsecção «mapa corporal» dentro deste bloco (dados biométricos). */
  bodyMapSectionTitle?: string;
  /** Texto quando o radar/mapa está no resumo de resultados (não duplicamos o carrossel aqui). */
  bodyMapEvalHint?: string;
};

function format1(v: number): string {
  return (Math.round(v * 10) / 10).toFixed(1);
}

type StatusKind = "normal" | "attention" | "lower" | "higher";

function statusColor(kind: StatusKind): string {
  switch (kind) {
    case "normal":
      return "var(--success)";
    case "attention":
      return "var(--warning)";
    case "lower":
      return "#2563eb";
    case "higher":
      return "#d97706";
    default:
      return "var(--text-secondary)";
  }
}

function labelForStatus(kind: StatusKind, copy: CheckInWellnessCopy): string {
  switch (kind) {
    case "normal":
      return copy.statusNormal;
    case "attention":
      return copy.statusAttention;
    case "lower":
      return copy.statusLower;
    case "higher":
      return copy.statusHigher;
    default:
      return copy.statusNormal;
  }
}

/** Sono (h): intervalo ~7–9 h = ideal; gauge 4–11 h → 0–1 */
function sleepHoursInsight(h: number): { kind: StatusKind; gauge: number } {
  let kind: StatusKind;
  if (h >= 7 && h <= 9) kind = "normal";
  else if (h < 7) kind = "lower";
  else kind = "higher";
  const gauge = Math.max(0, Math.min(1, (h - 4) / 7));
  return { kind, gauge };
}

/** Escala 1–5 (maior = melhor): ≥3,5 bom; 2,5–3,5 atenção; &lt;2,5 baixo */
function scaleHigherIsBetter(v: number): { kind: StatusKind; gauge: number } {
  let kind: StatusKind;
  if (v >= 3.5) kind = "normal";
  else if (v >= 2.5) kind = "attention";
  else kind = "lower";
  const gauge = Math.max(0, Math.min(1, (v - 1) / 4));
  return { kind, gauge };
}

/** Percentagem de check-ins hidratados */
function hydrationInsight(pct: number): { kind: StatusKind; gauge: number } {
  let kind: StatusKind;
  if (pct >= 65) kind = "normal";
  else if (pct >= 35) kind = "attention";
  else kind = "lower";
  const gauge = Math.max(0, Math.min(1, pct / 100));
  return { kind, gauge };
}

function StatusIcon({ kind }: { kind: StatusKind }) {
  if (kind === "normal") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[length:12px] leading-none" aria-hidden>
        ✓
      </span>
    );
  }
  if (kind === "attention") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--warning)_22%,transparent)] text-[length:12px] leading-none" aria-hidden>
        !
      </span>
    );
  }
  if (kind === "lower") {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center text-[length:14px] leading-none" aria-hidden>
        ↓
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center text-[length:14px] leading-none" aria-hidden>
      ↑
    </span>
  );
}

function VerticalGauge({ fill01, fillColor }: { fill01: number; fillColor: string }) {
  const h = Math.max(0, Math.min(100, fill01 * 100));
  return (
    <div
      className="relative h-[92px] w-3 shrink-0 overflow-hidden rounded-full border border-border bg-bg-secondary/70"
      role="presentation"
      aria-hidden
    >
      <div
        className="absolute bottom-0 left-0 right-0 rounded-full transition-[height] duration-300 ease-out"
        style={{ height: `${h}%`, backgroundColor: fillColor }}
      />
      <div
        className="pointer-events-none absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-border bg-bg"
        style={{ bottom: `calc(${h}% - 5px)` }}
      />
    </div>
  );
}

function BiometricCard({
  icon,
  abbr,
  mainNum,
  unit,
  statusKind,
  copy,
  gauge01,
  accent,
  extraHint,
}: {
  icon: string;
  abbr: string;
  mainNum: string;
  unit: string;
  statusKind: StatusKind;
  copy: CheckInWellnessCopy;
  gauge01: number;
  accent: string;
  extraHint?: ReactNode;
}) {
  const statusText = labelForStatus(statusKind, copy);
  const c = statusColor(statusKind);

  return (
    <article className="relative flex min-h-[120px] min-w-0 gap-2 rounded-2xl border border-border bg-transparent p-3 sm:min-h-[132px] sm:gap-3 sm:p-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[1.15rem] leading-none opacity-95" aria-hidden>
            {icon}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary">{abbr}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-0 sm:mt-3 sm:gap-x-1.5">
          <span className="text-[1.35rem] font-bold leading-none tabular-nums text-text-primary sm:text-[1.65rem] md:text-[1.75rem]">{mainNum}</span>
          <span className="text-xs font-medium text-text-secondary sm:text-sm">{unit}</span>
        </div>
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold" style={{ color: c }}>
          <StatusIcon kind={statusKind} />
          <span>{statusText}</span>
        </div>
        {extraHint && <div className="mt-2 text-[11px] leading-snug text-text-secondary">{extraHint}</div>}
      </div>
      <VerticalGauge fill01={gauge01} fillColor={accent} />
    </article>
  );
}

type Props = {
  data: CheckInWellnessAggregates;
  copy: CheckInWellnessCopy;
  /** Mapa corporal + radar (layout clássico) ou conteúdo extra; renderizado no fim da secção biométrica. */
  bodyMappingSlot?: ReactNode;
};

export function CheckInWellnessSection({ data, copy, bodyMappingSlot }: Props) {
  const { zoneShare } = data;
  const hasZones = zoneShare.green + zoneShare.yellow + zoneShare.red > 0;

  const sh = sleepHoursInsight(data.avgSleepHours);
  const sq = scaleHigherIsBetter(data.avgSleepQuality);
  const hy = hydrationInsight(data.hydrationOkPercent);
  const st = scaleHigherIsBetter(data.avgStress);
  const fa = scaleHigherIsBetter(data.avgFatigue);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-text-primary">
            <span aria-hidden className="text-xl">
              🩺
            </span>
            {copy.title}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-secondary">{copy.intro}</p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-secondary">
          {copy.sample}
        </span>
      </div>

      <p className="mb-4 text-xs text-text-secondary">{copy.scaleHint}</p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <BiometricCard
          icon="😴"
          abbr={copy.abbrSleepH}
          mainNum={format1(data.avgSleepHours)}
          unit="h"
          statusKind={sh.kind}
          copy={copy}
          gauge01={sh.gauge}
          accent={statusColor(sh.kind)}
        />
        <BiometricCard
          icon="💤"
          abbr={copy.abbrSleepQ}
          mainNum={format1(data.avgSleepQuality)}
          unit="/5"
          statusKind={sq.kind}
          copy={copy}
          gauge01={sq.gauge}
          accent={statusColor(sq.kind)}
        />
        <BiometricCard
          icon="💧"
          abbr={copy.abbrHydration}
          mainNum={String(Math.round(data.hydrationOkPercent))}
          unit="%"
          statusKind={hy.kind}
          copy={copy}
          gauge01={hy.gauge}
          accent={statusColor(hy.kind)}
          extraHint={copy.hydrationHint}
        />
        <BiometricCard
          icon="🧘"
          abbr={copy.abbrStress}
          mainNum={format1(data.avgStress)}
          unit="/5"
          statusKind={st.kind}
          copy={copy}
          gauge01={st.gauge}
          accent={statusColor(st.kind)}
        />
        <BiometricCard
          icon="🔋"
          abbr={copy.abbrFatigue}
          mainNum={format1(data.avgFatigue)}
          unit="/5"
          statusKind={fa.kind}
          copy={copy}
          gauge01={fa.gauge}
          accent={statusColor(fa.kind)}
        />
      </div>

      {hasZones && (
        <div className="mt-6 rounded-2xl border border-border bg-transparent p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-text-primary">{copy.zonesTitle}</h3>
          <p className="mb-3 mt-1 text-xs text-text-secondary">
            {copy.zoneGreen} · {copy.zoneYellow} · {copy.zoneRed}
          </p>
          <div className="flex h-4 overflow-hidden rounded-full border border-border" role="img" aria-label={copy.zonesTitle}>
            {zoneShare.green > 0 && (
              <div
                className="bg-success min-w-[4px] transition-all"
                style={{ width: `${zoneShare.green}%` }}
                title={`${copy.zoneGreen}: ${format1(zoneShare.green)}%`}
              />
            )}
            {zoneShare.yellow > 0 && (
              <div
                className="bg-warning min-w-[4px] transition-all"
                style={{ width: `${zoneShare.yellow}%` }}
                title={`${copy.zoneYellow}: ${format1(zoneShare.yellow)}%`}
              />
            )}
            {zoneShare.red > 0 && (
              <div
                className="bg-danger min-w-[4px] transition-all"
                style={{ width: `${zoneShare.red}%` }}
                title={`${copy.zoneRed}: ${format1(zoneShare.red)}%`}
              />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-secondary">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success align-middle" /> {copy.zoneGreen}{" "}
              <span className="font-medium text-text-primary">{format1(zoneShare.green)}%</span>
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-warning align-middle" /> {copy.zoneYellow}{" "}
              <span className="font-medium text-text-primary">{format1(zoneShare.yellow)}%</span>
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-danger align-middle" /> {copy.zoneRed}{" "}
              <span className="font-medium text-text-primary">{format1(zoneShare.red)}%</span>
            </span>
          </div>
        </div>
      )}

      {(bodyMappingSlot != null || Boolean(copy.bodyMapEvalHint)) ? (
        <div className="mt-6 space-y-3 border-t border-border pt-6">
          {copy.bodyMapSectionTitle ? (
            <h3 className="text-sm font-semibold tracking-tight text-text-primary">{copy.bodyMapSectionTitle}</h3>
          ) : null}
          {copy.bodyMapEvalHint ? (
            <p className="m-0 max-w-prose text-sm leading-relaxed text-text-secondary">{copy.bodyMapEvalHint}</p>
          ) : null}
          {bodyMappingSlot}
        </div>
      ) : null}
    </section>
  );
}
