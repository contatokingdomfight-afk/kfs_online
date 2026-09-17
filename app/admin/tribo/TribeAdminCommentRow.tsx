"use client";

import { useState, useTransition } from "react";
import { adminHideTribeCommentAction, adminUnhideTribeCommentAction } from "./actions";

export type TribeAdminCommentRowData = {
  id: string;
  authorUserId: string;
  body: string;
  status: string;
  createdAt: string;
};

export function TribeAdminCommentRow({
  comment,
  authorName,
  onChanged,
}: {
  comment: TribeAdminCommentRowData;
  authorName: string;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const action = comment.status === "HIDDEN" ? adminUnhideTribeCommentAction : adminHideTribeCommentAction;
      const res = await action(comment.id);
      if (res.error) setError(res.error);
      else onChanged();
    });
  }

  return (
    <li
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-secondary)",
        opacity: comment.status === "HIDDEN" ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{authorName}</span>
        {comment.status === "HIDDEN" && (
          <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600 }}>OCULTO</span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)" }}>{comment.body}</p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className="btn"
          style={{ fontSize: 12, padding: "4px 10px", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
          {comment.status === "HIDDEN" ? "Repor" : "Ocultar"}
        </button>
      </div>
      {error && <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{error}</p>}
    </li>
  );
}
