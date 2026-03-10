"use client";

import dynamic from "next/dynamic";

export const ConfirmModal = dynamic(
  () => import("@/components/ConfirmModal").then((m) => ({ default: m.ConfirmModal })),
  { ssr: false }
);
