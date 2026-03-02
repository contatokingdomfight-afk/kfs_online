"use client";

import { useState } from "react";
import { CursoForm } from "../CursoForm";

type Course = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  modality: string | null;
  level: string | null;
  included_in_digital_plan: boolean | null;
  sort_order: number | null;
  is_active: boolean | null;
  price: number | null;
  available_for_purchase: boolean | null;
};

type Props = {
  course: Course;
};

export function CollapsibleCourseDetails({ course }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "clamp(14px, 3.5vw, 18px)",
          background: "var(--surface)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontSize: "clamp(15px, 3.8vw, 17px)",
          fontWeight: 600,
          color: "var(--text-primary)",
          textAlign: "left",
        }}
      >
        <span>Dados do curso (nome, categoria, preço, etc.)</span>
        <span style={{ fontSize: 18, color: "var(--text-secondary)" }}>{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 clamp(20px, 5vw, 24px) clamp(20px, 5vw, 24px) clamp(20px, 5vw, 24px)" }}>
          <CursoForm
            courseId={course.id}
            initialName={course.name}
            initialDescription={course.description ?? ""}
            initialCategory={course.category ?? "TECHNIQUE"}
            initialModality={course.modality}
            initialIncludedInDigital={course.included_in_digital_plan ?? true}
            initialSortOrder={course.sort_order ?? 0}
            initialIsActive={course.is_active ?? true}
            initialPrice={course.price != null ? Number(course.price) : null}
            initialAvailableForPurchase={course.available_for_purchase ?? false}
            initialLevel={course.level}
          />
        </div>
      )}
    </div>
  );
}
