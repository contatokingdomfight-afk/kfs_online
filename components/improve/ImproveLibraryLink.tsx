"use client";

import Link from "next/link";

type Props = {
  courseId: string;
  courseName: string;
  axisLabel?: string;
  locale: "pt" | "en";
  className?: string;
};

export function ImproveLibraryLink({ courseId, courseName, axisLabel, locale, className = "" }: Props) {
  const label =
    locale === "pt"
      ? axisLabel
        ? `Ver como melhorar (${axisLabel}) — ${courseName}`
        : `Ver como melhorar — ${courseName}`
      : axisLabel
        ? `See how to improve (${axisLabel}) — ${courseName}`
        : `See how to improve — ${courseName}`;

  return (
    <Link
      href={`/dashboard/biblioteca/${courseId}`}
      className={`inline-flex items-center gap-1 text-sm font-medium text-primary no-underline hover:underline ${className}`}
    >
      📚 {label} →
    </Link>
  );
}
