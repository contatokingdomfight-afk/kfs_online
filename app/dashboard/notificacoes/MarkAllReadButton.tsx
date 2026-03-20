"use client";

import { useTransition } from "react";
import { markAllNotificationsRead } from "../notification-actions";

type Props = {
  label: string;
  disabled?: boolean;
};

export function MarkAllReadButton({ label, disabled }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={disabled || pending}
      style={{ fontSize: "clamp(13px, 3.2vw, 15px)" }}
      onClick={() =>
        startTransition(() => {
          void markAllNotificationsRead();
        })
      }
    >
      {pending ? "…" : label}
    </button>
  );
}
