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
};

function format1(v: number): string {
  return (Math.round(v * 10) / 10).toFixed(1);
}

function MiniScaleBar({ value, max = 5 }: { value: number; max?: number }) {
  const filled = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <div className="flex gap-1 mt-2" aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-sm ${i < filled ? "bg-primary" : "bg-border opacity-60"}`}
        />
      ))}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  children,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg/80 p-4 shadow-sm flex flex-col min-h-[120px]">
      <div className="flex items-start gap-2 mb-1">
        <span className="text-lg leading-none" aria-hidden>
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary leading-snug">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary tabular-nums mt-auto">{value}</p>
      {hint && <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

type Props = {
  data: CheckInWellnessAggregates;
  copy: CheckInWellnessCopy;
};

export function CheckInWellnessSection({ data, copy }: Props) {
  const { zoneShare } = data;
  const hasZones = zoneShare.green + zoneShare.yellow + zoneShare.red > 0;

  return (
    <section className="rounded-2xl border border-border bg-bg-secondary p-4 sm:p-6 shadow-md overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <span aria-hidden>🩺</span>
            {copy.title}
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-xl leading-relaxed">{copy.intro}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-bg px-3 py-1 text-xs font-medium text-text-secondary border border-border shrink-0">
          {copy.sample}
        </span>
      </div>

      <p className="text-xs text-text-secondary mb-4">{copy.scaleHint}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <MetricCard icon="😴" label={copy.sleepH} value={`${format1(data.avgSleepHours)} h`} />
        <MetricCard
          icon="💤"
          label={copy.sleepQ}
          value={`${format1(data.avgSleepQuality)}/5`}
        >
          <MiniScaleBar value={data.avgSleepQuality} />
        </MetricCard>
        <MetricCard
          icon="💧"
          label={copy.hydration}
          value={`${Math.round(data.hydrationOkPercent)}%`}
          hint={copy.hydrationHint}
        >
          <div className="mt-2 h-2 rounded-full bg-bg overflow-hidden border border-border">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${Math.min(100, data.hydrationOkPercent)}%` }}
            />
          </div>
        </MetricCard>
        <MetricCard
          icon="🧘"
          label={copy.stress}
          value={`${format1(data.avgStress)}/5`}
        >
          <MiniScaleBar value={data.avgStress} />
        </MetricCard>
        <MetricCard
          icon="🔋"
          label={copy.fatigue}
          value={`${format1(data.avgFatigue)}/5`}
        >
          <MiniScaleBar value={data.avgFatigue} />
        </MetricCard>
      </div>

      {hasZones && (
        <div className="rounded-xl border border-border bg-bg/60 p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">{copy.zonesTitle}</h3>
          <p className="text-xs text-text-secondary mb-3">
            {copy.zoneGreen} · {copy.zoneYellow} · {copy.zoneRed}
          </p>
          <div className="flex h-4 rounded-full overflow-hidden border border-border" role="img" aria-label={copy.zonesTitle}>
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
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-text-secondary">
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-success mr-1 align-middle" /> {copy.zoneGreen}{" "}
              <span className="text-text-primary font-medium">{format1(zoneShare.green)}%</span>
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-warning mr-1 align-middle" /> {copy.zoneYellow}{" "}
              <span className="text-text-primary font-medium">{format1(zoneShare.yellow)}%</span>
            </span>
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-danger mr-1 align-middle" /> {copy.zoneRed}{" "}
              <span className="text-text-primary font-medium">{format1(zoneShare.red)}%</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
