"use client";

export type Mission = {
  id: string;
  target: string;
  xpReward: number;
  progress: number; // 0–100
};

type Props = {
  missions: Mission[];
};

export function MissionCard({ missions }: Props) {
  if (missions.length === 0) return null;

  return (
    <section className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
      <h2 className="text-base font-bold text-text-primary mb-1 flex items-center gap-2">
        <span aria-hidden>🎯</span>
        Missões ativas
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        Completa estes objetivos para ganhar XP e subir de nível.
      </p>
      <ul className="space-y-3">
        {missions.map((m) => (
          <li
            key={m.id}
            className="flex flex-col gap-2 p-3 rounded-xl bg-bg border border-border hover:border-primary/30 transition-colors"
          >
            <p className="text-sm font-medium text-text-primary">{m.target}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-primary font-semibold">+{m.xpReward} XP</span>
              <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, m.progress)}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
