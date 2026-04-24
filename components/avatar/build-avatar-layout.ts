import {
  buildBodyScaleFactors,
  type AvatarMeasurements,
  type BodyScaleFactors,
  type Modality,
  type PoseTag,
} from "./avatar-utils";
import { getPoseLayout, type PoseLayout } from "./Pose";

/** Mesma geometria que `Avatar.tsx` (corpo + pose) para reutilizar em vista técnica. */
export function buildAvatarPoseLayout(
  measurements: AvatarMeasurements | null | undefined,
  modality: Modality,
  poseTag: PoseTag
): { scales: BodyScaleFactors; pose: PoseLayout } {
  const scales = buildBodyScaleFactors(measurements);
  const armLenBase = 58 * scales.arm * scales.bulk;
  const pose = getPoseLayout(modality, armLenBase, poseTag, {
    cx: 100,
    yHip: 188,
    halfHipW: 40 * scales.hip * scales.bulk,
  });
  return { scales, pose };
}
