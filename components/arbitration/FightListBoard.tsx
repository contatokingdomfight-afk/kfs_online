"use client";

import type { ArbitrationFightListRow } from "@/lib/arbitration/types";
import { modalityLabel, statusLabel } from "@/lib/arbitration/scoring";
import Link from "next/link";
import { DeleteArbitrationFightButton } from "@/components/arbitration/DeleteArbitrationFightButton";

type Props = {
  fights: ArbitrationFightListRow[];
  locale: "pt" | "en";
  canDeleteFights?: boolean;
};

function statusBadgeClass(status: string) {
  if (status === "IN_PROGRESS") return "arb-badge arb-badge-progress";
  if (status === "COMPLETED") return "arb-badge arb-badge-done";
  return "arb-badge arb-badge-scheduled";
}

export function FightListBoard({ fights, locale, canDeleteFights = false }: Props) {
  const upcoming = fights.filter((f) => f.status === "SCHEDULED");
  const inProgress = fights.filter((f) => f.status === "IN_PROGRESS");
  const completed = fights.filter((f) => f.status === "COMPLETED");

  if (fights.length === 0) {
    return (
      <div className="arb-empty">
        <p>Nenhum combate registado.</p>
        <Link href="/coach/arbitragem/gestao" className="btn btn-primary" style={{ marginTop: 12, display: "inline-block" }}>
          Criar evento e combates
        </Link>
      </div>
    );
  }

  return (
    <div>
      <FightSection title="Em andamento" fights={inProgress} locale={locale} canDeleteFights={canDeleteFights} />
      <FightSection title="Próximos combates" fights={upcoming} locale={locale} canDeleteFights={canDeleteFights} />
      <FightSection title="Encerrados" fights={completed} locale={locale} canDeleteFights={canDeleteFights} />
    </div>
  );
}

function FightSection({
  title,
  fights,
  locale,
  canDeleteFights,
}: {
  title: string;
  fights: ArbitrationFightListRow[];
  locale: "pt" | "en";
  canDeleteFights: boolean;
}) {
  if (fights.length === 0) return null;

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--text-secondary)" }}>{title}</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {fights.map((fight) => (
          <FightCard key={fight.id} fight={fight} locale={locale} canDeleteFights={canDeleteFights} />
        ))}
      </div>
    </section>
  );
}

function FightCard({
  fight,
  locale,
  canDeleteFights,
}: {
  fight: ArbitrationFightListRow;
  locale: "pt" | "en";
  canDeleteFights: boolean;
}) {
  const canJudge = fight.status === "SCHEDULED" || fight.status === "IN_PROGRESS";

  return (
    <article className="arb-card arb-fight-card">
      <div className="arb-fight-meta">
        <span className={statusBadgeClass(fight.status)}>{statusLabel(fight.status, locale)}</span>
        <span>{modalityLabel(fight.modality, locale)}</span>
        <span>{fight.category}</span>
        {fight.weightClass ? <span>{fight.weightClass}</span> : null}
        <span style={{ opacity: 0.7 }}>{fight.eventName}</span>
      </div>

      <div className="arb-athletes">
        <div className="arb-corner-blue">{fight.athleteBlueName}</div>
        <div className="arb-vs">VS</div>
        <div className="arb-corner-red">{fight.athleteRedName}</div>
      </div>

      {canJudge ? (
        <Link
          href={`/coach/arbitragem/${fight.id}`}
          className="btn btn-primary"
          style={{ textDecoration: "none", textAlign: "center", minHeight: 48, fontWeight: 700 }}
        >
          {fight.status === "SCHEDULED" ? "Iniciar Julgamento" : "Continuar Julgamento"}
        </Link>
      ) : (
        <Link
          href={`/coach/arbitragem/${fight.id}`}
          className="btn btn-secondary"
          style={{ textDecoration: "none", textAlign: "center" }}
        >
          Ver resultado
        </Link>
      )}

      {canDeleteFights ? (
        <div className="arb-fight-card-actions">
          <DeleteArbitrationFightButton
            fightId={fight.id}
            label={`${fight.athleteBlueName} vs ${fight.athleteRedName}`}
          />
        </div>
      ) : null}
    </article>
  );
}
