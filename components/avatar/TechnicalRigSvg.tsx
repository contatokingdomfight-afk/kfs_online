import type { BodyScaleFactors } from "./avatar-utils";
import type { PoseLayout } from "./Pose";
import { computeAvatarRigJoints } from "@/lib/avatar-rig-joints";

type Props = {
  scales: BodyScaleFactors;
  pose: PoseLayout;
  className?: string;
};

const ROOT_STYLE = {
  ["--avatar-stroke" as string]: "color-mix(in srgb, var(--border) 92%, var(--text-secondary) 8%)",
  ["--rig-bone" as string]: "color-mix(in srgb, var(--primary) 72%, #6b21a8 28%)",
  ["--rig-joint" as string]: "color-mix(in srgb, var(--primary) 55%, var(--text-secondary) 45%)",
  ["--rig-ik" as string]: "color-mix(in srgb, var(--text-secondary) 45%, transparent)",
  ["--rig-mesh" as string]: "color-mix(in srgb, var(--text-secondary) 22%, transparent)",
} as const;

/**
 * Vista técnica 2D estilo «mesh + ossos»: linhas de ossos, nós, guias tipo IK e malha muito suave.
 * Usa os mesmos `BodyScaleFactors` e `PoseLayout` que o avatar ilustrativo (dados da ficha 6.4 + perfil).
 */
export function TechnicalRigSvg({ scales, pose, className }: Props) {
  const j = computeAvatarRigJoints(scales, pose);

  return (
    <div className={className} style={ROOT_STYLE}>
      <svg viewBox="0 0 200 400" className="mx-auto block w-full max-w-[200px]" style={{ overflow: "visible" }} aria-hidden>
        <g opacity={0.14} fill="var(--rig-mesh)" stroke="var(--avatar-stroke)" strokeWidth={0.6}>
          <ellipse
            cx={j.cx}
            cy={j.headCy}
            rx={j.headRx}
            ry={j.headRy}
            transform={`rotate(${j.torsoDeg}, ${j.torsoPivot.x}, ${j.torsoPivot.y})`}
          />
          <path d={j.torsoPath} transform={`rotate(${j.torsoDeg}, ${j.torsoPivot.x}, ${j.torsoPivot.y})`} />
        </g>

        <g stroke="var(--rig-ik)" strokeWidth={0.55} strokeDasharray="4 5" opacity={0.55} fill="none">
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.ankleL.x} y2={j.ankleL.y} />
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.ankleR.x} y2={j.ankleR.y} />
          <line x1={j.ankleL.x} y1={j.ankleL.y} x2={j.ankleR.x} y2={j.ankleR.y} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.wristL.x} y2={j.wristL.y} opacity={0.45} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.wristR.x} y2={j.wristR.y} opacity={0.45} />
        </g>

        <g stroke="var(--rig-bone)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.lumbar.x} y2={j.lumbar.y} />
          <line x1={j.lumbar.x} y1={j.lumbar.y} x2={j.thorax.x} y2={j.thorax.y} />
          <line x1={j.thorax.x} y1={j.thorax.y} x2={j.sternum.x} y2={j.sternum.y} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.neckBase.x} y2={j.neckBase.y} />
          <line x1={j.neckBase.x} y1={j.neckBase.y} x2={j.headC.x} y2={j.headC.y} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.shoulderLw.x} y2={j.shoulderLw.y} />
          <line x1={j.sternum.x} y1={j.sternum.y} x2={j.shoulderRw.x} y2={j.shoulderRw.y} />
          <line x1={j.shoulderLw.x} y1={j.shoulderLw.y} x2={j.elbowL.x} y2={j.elbowL.y} />
          <line x1={j.elbowL.x} y1={j.elbowL.y} x2={j.wristL.x} y2={j.wristL.y} />
          <line x1={j.shoulderRw.x} y1={j.shoulderRw.y} x2={j.elbowR.x} y2={j.elbowR.y} />
          <line x1={j.elbowR.x} y1={j.elbowR.y} x2={j.wristR.x} y2={j.wristR.y} />
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.hipL0.x} y2={j.hipL0.y} />
          <line x1={j.pelvis.x} y1={j.pelvis.y} x2={j.hipR0.x} y2={j.hipR0.y} />
          <line x1={j.hipL0.x} y1={j.hipL0.y} x2={j.kneeL.x} y2={j.kneeL.y} />
          <line x1={j.kneeL.x} y1={j.kneeL.y} x2={j.ankleL.x} y2={j.ankleL.y} />
          <line x1={j.hipR0.x} y1={j.hipR0.y} x2={j.kneeR.x} y2={j.kneeR.y} />
          <line x1={j.kneeR.x} y1={j.kneeR.y} x2={j.ankleR.x} y2={j.ankleR.y} />
        </g>

        <g fill="var(--rig-joint)">
          {[
            j.headC,
            j.neckBase,
            j.sternum,
            j.thorax,
            j.lumbar,
            j.pelvis,
            j.shoulderLw,
            j.shoulderRw,
            j.elbowL,
            j.elbowR,
            j.wristL,
            j.wristR,
            j.kneeL,
            j.kneeR,
            j.ankleL,
            j.ankleR,
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={j.jointR} />
          ))}
        </g>
      </svg>
    </div>
  );
}
