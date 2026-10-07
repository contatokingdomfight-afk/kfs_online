import { XP_SOURCE_META, type XpSource, type XpSummary } from "@/lib/xp-rules";
import type { LeaderboardV2Row } from "@/lib/leaderboard";

type Props = {
  summary: XpSummary;
  me: LeaderboardV2Row | null;
  totalRanked: number;
  modality: string | null;
  modalityNames: Map<string, string>;
  rules: Partial<Record<XpSource, number>>;
  periodLabel: string | null;
  locale: string;
};

/** Cartão "O teu XP": posição, pontuação/XP, XP por modalidade e por fonte, e como funciona. */
export function MyXpCard({ summary, me, totalRanked, modality, modalityNames, rules, periodLabel, locale }: Props) {
  const fmt = (n: number) => n.toLocaleString(locale === "en" ? "en-GB" : "pt-PT");
  const nameOf = (code: string) => modalityNames.get(code) ?? code;
  const maxSource = Math.max(1, ...summary.bySource.map((s) => s.xp));

  return (
    <section className="card mb-4" style={{ padding: "var(--space-4)" }} aria-labelledby="o-teu-xp">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p id="o-teu-xp" className="m-0 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {modality ? `O teu XP em ${nameOf(modality)}` : "A tua Pontuação Kingdom"}
            {periodLabel ? ` · ${periodLabel}` : ""}
          </p>
          <p className="m-0 mt-1 text-3xl font-bold text-[var(--text-primary)]">
            {me ? fmt(me.score) : "—"}
            <span className="ml-1 text-base font-semibold text-[var(--text-secondary)]">{modality ? "XP" : "/ 1000"}</span>
          </p>
        </div>
        {me && (
          <p className="m-0 text-right text-sm text-[var(--text-secondary)]">
            <span className="block text-2xl font-bold text-[var(--primary)]">#{me.rank}</span>
            de {totalRanked}
          </p>
        )}
      </div>

      {!modality && (
        <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">
          {fmt(summary.total)} XP no total
          {summary.byModality.length > 0 &&
            ` · ${summary.byModality.map((m) => `${nameOf(m.code)} ${fmt(m.xp)}`).join(" · ")}`}
          {summary.general > 0 && ` · geral ${fmt(summary.general)}`}
        </p>
      )}

      {summary.bySource.length > 0 && (
        <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0" aria-label="XP por fonte">
          {summary.bySource.map((s) => (
            <li key={s.source}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-[var(--text-primary)]">
                  <span aria-hidden>{XP_SOURCE_META[s.source].emoji}</span> {XP_SOURCE_META[s.source].label}
                  <span className="ml-1 text-xs text-[var(--text-secondary)]">({s.events})</span>
                </span>
                <strong className="text-[var(--text-primary)]">{fmt(s.xp)} XP</strong>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }} aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${Math.round((s.xp / maxSource) * 100)}%`, background: "var(--primary)" }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {summary.bySource.length === 0 && (
        <p className="m-0 mt-3 text-sm text-[var(--text-secondary)]">Ainda sem XP {periodLabel ? "neste período" : ""}. Cada treino conta!</p>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">Como funciona</summary>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          {modality ? (
            <p className="m-0">
              O ranking de {nameOf(modality)} ordena por XP ganho nesta modalidade, mais o XP geral (avaliações físicas e cursos sem
              modalidade).
            </p>
          ) : (
            <p className="m-0">
              A <strong className="text-[var(--text-primary)]">Pontuação Kingdom</strong> (0–1000) compara-te com quem treina as mesmas
              modalidades que tu: em cada modalidade vemos a tua posição face aos colegas e fazemos a média. Assim, treinar várias
              modalidades não te põe à frente só por somar mais XP — conta o quanto te destacas em cada uma.
            </p>
          )}
          <p className="m-0 font-semibold text-[var(--text-primary)]">Como ganhar XP</p>
          <ul className="m-0 list-disc space-y-1 pl-5">
            {(Object.keys(XP_SOURCE_META) as XpSource[])
              .filter((s) => (rules[s] ?? 0) > 0)
              .map((s) => (
                <li key={s}>
                  <strong className="text-[var(--text-primary)]">{XP_SOURCE_META[s].label}:</strong> {XP_SOURCE_META[s].rule(rules[s] ?? 0)}
                </li>
              ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
