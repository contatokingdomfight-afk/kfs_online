import type { Modality } from "./avatar-utils";

type Props = {
  type: Modality;
  /** Coordenadas no viewBox (já com rotação do torso aplicada). */
  handL: { x: number; y: number };
  handR: { x: number; y: number };
};

/** Luvas (boxing), wraps (muay thai), vazio (bjj). */
export function Equipment({ type, handL, handR }: Props) {
  const gear = "var(--avatar-gear)";

  if (type === "bjj") {
    return null;
  }

  if (type === "boxing") {
    const r = 11;
    return (
      <g className="avatar-equipment" fill={gear} fillOpacity={0.88} stroke="var(--avatar-stroke)" strokeWidth={0.45}>
        <ellipse cx={handL.x} cy={handL.y - 2} rx={r} ry={r * 0.92} />
        <ellipse cx={handR.x} cy={handR.y - 2} rx={r} ry={r * 0.92} />
        <ellipse cx={handL.x} cy={handL.y - 8} rx={r * 0.55} ry={r * 0.35} fillOpacity={0.5} />
        <ellipse cx={handR.x} cy={handR.y - 8} rx={r * 0.55} ry={r * 0.35} fillOpacity={0.5} />
      </g>
    );
  }

  /* muay_thai — wraps: traços finos em camadas */
  const wrapStroke = (hand: { x: number; y: number }, seed: number) => {
    const ox = hand.x + seed * 0.4;
    const oy = hand.y - 4;
    const paths: string[] = [];
    for (let i = 0; i < 5; i++) {
      const t = i * 2.2;
      paths.push(
        `M ${ox - 8 + t * 0.3},${oy + i * 3.5} Q ${ox + 2},${oy + i * 3.5 + 2} ${ox + 10 - t * 0.2},${oy + i * 3.5 + 1.5}`
      );
    }
    return paths;
  };

  const leftStrands = wrapStroke(handL, -1);
  const rightStrands = wrapStroke(handR, 1);

  return (
    <g className="avatar-equipment" fill="none" stroke={gear} strokeWidth={1.45} strokeLinecap="round" opacity={0.94}>
      {leftStrands.map((d, i) => (
        <path key={`wl-${i}`} d={d} />
      ))}
      {rightStrands.map((d, i) => (
        <path key={`wr-${i}`} d={d} />
      ))}
      <path
        d={`M ${handL.x - 6},${handL.y + 2} l 3,-14 l 4,14 M ${handR.x + 6},${handR.y + 2} l -3,-14 l -4,14`}
        strokeWidth={0.9}
        opacity={0.75}
      />
    </g>
  );
}
