"use client";

import { useState } from "react";

/** Texto longo recolhido em N linhas, com «Ler mais» / «Ler menos». */
export function ExpandableText({
  text,
  lines = 4,
  locale = "pt",
  style,
}: {
  text: string;
  lines?: number;
  locale?: "pt" | "en";
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const pt = locale !== "en";
  // Só oferece «Ler mais» quando o texto é visivelmente maior do que as linhas mostradas.
  const isLong = text.length > lines * 70 || text.split("\n").length > lines;
  return (
    <div>
      <p
        style={{
          margin: 0,
          whiteSpace: "pre-line",
          ...style,
          ...(open || !isLong
            ? {}
            : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }),
        }}
      >
        {text}
      </p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{ border: 0, background: "none", padding: "8px 0 0", color: "var(--primary)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          {open ? (pt ? "Ler menos" : "Show less") : pt ? "Ler mais" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
