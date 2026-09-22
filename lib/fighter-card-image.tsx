import type { FighterCardData } from "@/lib/fighter-card";

/** Formato vertical — Instagram Stories / WhatsApp Status (ver DOCS/FIGHTER_CARD_MVP.md §3). */
export const FIGHTER_CARD_WIDTH = 1080;
export const FIGHTER_CARD_HEIGHT = 1920;

const BRAND_PRIMARY = "#c1121f";
const BRAND_DARK = "#0a0a0a";

/** Cor aproximada por faixa, só para o selo visual do cartão (não é dado de negócio). */
function beltColorHex(beltName: string): string {
  const base = beltName.split("/")[0]?.trim().toLowerCase() ?? "";
  if (base.startsWith("dourado")) return "#d4af37";
  switch (base) {
    case "branca":
      return "#f5f5f5";
    case "amarela":
      return "#ffd500";
    case "verde":
      return "#1e9e4c";
    case "azul":
      return "#1565c0";
    case "vermelha":
      return "#c1121f";
    case "preta":
      return "#141414";
    default:
      return "#8a8a8a";
  }
}

function beltTextColor(beltName: string): string {
  const base = beltName.split("/")[0]?.trim().toLowerCase() ?? "";
  return base === "branca" || base === "amarela" ? "#141414" : "#ffffff";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/** Constrói a árvore JSX consumida pelo `ImageResponse` (next/og) — usada tanto no preview de
 * link (OG) como na partilha nativa/descarregar. Só usa o subconjunto de CSS suportado pelo Satori.
 * `ctaHost` é o domínio a mostrar no rodapé (sem protocolo, ex. "kingdomfight.com"). */
export function buildFighterCardElement(data: FighterCardData, ctaHost: string) {
  const beltBg = beltColorHex(data.beltName);
  const beltFg = beltTextColor(data.beltName);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: BRAND_DARK,
        backgroundImage: `linear-gradient(160deg, ${BRAND_DARK} 0%, #1a0303 55%, ${BRAND_DARK} 100%)`,
        fontFamily: "sans-serif",
        padding: "72px 64px",
        color: "#ffffff",
      }}
    >
      {/* Cabeçalho / marca */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: 4,
            color: BRAND_PRIMARY,
          }}
        >
          KINGDOM FIGHT SCHOOL
        </div>
      </div>

      {/* Avatar + nome */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 64 }}>
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.avatarUrl}
            alt=""
            width={280}
            height={280}
            style={{ borderRadius: 140, border: `6px solid ${BRAND_PRIMARY}`, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: 280,
              height: 280,
              borderRadius: 140,
              border: `6px solid ${BRAND_PRIMARY}`,
              backgroundColor: "#2a2a2a",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 96,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {initials(data.name)}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, marginTop: 36, textAlign: "center" }}>
          {data.name}
        </div>
        {data.primaryModalityLabel ? (
          <div style={{ display: "flex", fontSize: 30, color: "#c9c9c9", marginTop: 8 }}>
            {data.primaryModalityLabel}
          </div>
        ) : null}
      </div>

      {/* Selo de faixa */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }}>
        <div
          style={{
            display: "flex",
            backgroundColor: beltBg,
            color: beltFg,
            padding: "16px 48px",
            borderRadius: 999,
            fontSize: 36,
            fontWeight: 800,
          }}
        >
          Faixa {data.beltName}
        </div>
      </div>

      {/* Estatísticas */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 64, gap: 24 }}>
        {[
          { label: "XP", value: data.xp.toLocaleString("pt-PT") },
          { label: "Aulas", value: String(data.totalClasses) },
          { label: "Semanas seguidas", value: String(data.consecutiveWeeks) },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 24,
              padding: "28px 32px",
              minWidth: 220,
            }}
          >
            <div style={{ display: "flex", fontSize: 48, fontWeight: 800 }}>{stat.value}</div>
            <div style={{ display: "flex", fontSize: 24, color: "#c9c9c9", marginTop: 6 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Badges recentes */}
      {data.badges.length > 0 ? (
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", marginTop: 48, gap: 16 }}>
          {data.badges.map((b) => (
            <div
              key={b.code}
              style={{
                display: "flex",
                backgroundColor: "rgba(193,18,31,0.18)",
                border: `2px solid ${BRAND_PRIMARY}`,
                borderRadius: 999,
                padding: "12px 24px",
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              🏅 {b.name}
            </div>
          ))}
        </div>
      ) : null}

      {/* Rodapé: prova social + CTA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "auto",
          paddingTop: 48,
        }}
      >
        {data.memberSinceLabel ? (
          <div style={{ display: "flex", fontSize: 26, color: "#c9c9c9" }}>
            Aluno(a) desde {data.memberSinceLabel}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            marginTop: 20,
            backgroundColor: BRAND_PRIMARY,
            borderRadius: 16,
            padding: "20px 40px",
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          Treina comigo → {ctaHost}/aula-experimental
        </div>
      </div>
    </div>
  );
}
