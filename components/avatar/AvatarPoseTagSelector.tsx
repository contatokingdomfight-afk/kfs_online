"use client";

import type { PoseTag } from "./avatar-utils";
import { POSE_TAG_LABELS } from "./avatar-utils";

type Props = {
  value: PoseTag;
  onChange: (tag: PoseTag) => void;
  className?: string;
};

/** Chips para alternar entre guarda da modalidade e pose «estrela». */
export function AvatarPoseTagSelector({ value, onChange, className }: Props) {
  const tags: PoseTag[] = ["auto", "star"];
  return (
    <div className={className} role="group" aria-label="Pose da figura">
      <div className="flex flex-wrap gap-2 justify-center">
        {tags.map((tag) => {
          const active = value === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(tag)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/15 text-text-primary"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-primary/50 hover:text-text-primary",
              ].join(" ")}
            >
              {POSE_TAG_LABELS[tag]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
