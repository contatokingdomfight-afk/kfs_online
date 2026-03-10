"use client";

import dynamic from "next/dynamic";

export const CoachStudentProfileModal = dynamic(
  () => import("@/components/CoachStudentProfileModal").then((m) => ({ default: m.CoachStudentProfileModal })),
  { ssr: false }
);

export type { StudentProfileForModal } from "@/components/CoachStudentProfileModal";
