"use client";

import dynamic from "next/dynamic";

export const SuccessConfirmModal = dynamic(
  () => import("@/components/SuccessConfirmModal").then((m) => ({ default: m.SuccessConfirmModal })),
  { ssr: false }
);
