"use client";

import { useFormState } from "react-dom";
import { updateCommentVisibility, type UpdateCommentVisibilityResult } from "../actions";

type Props = {
  commentId: string;
  athleteId: string;
  initialVisibility: "PRIVATE" | "SHARED";
};

export function CommentVisibilityRow({ commentId, athleteId, initialVisibility }: Props) {
  const [state, formAction] = useFormState(updateCommentVisibility, null as UpdateCommentVisibilityResult | null);

  return (
    <form action={formAction} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 10 }}>
      <input type="hidden" name="commentId" value={commentId} />
      <input type="hidden" name="athleteId" value={athleteId} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)" }}>
        Visibilidade
        <select name="visibility" defaultValue={initialVisibility} className="input" style={{ fontSize: 13, minHeight: 36, maxWidth: 220 }}>
          <option value="PRIVATE">Só equipa</option>
          <option value="SHARED">Visível para o aluno</option>
        </select>
      </label>
      <button type="submit" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>
        Guardar
      </button>
      {state?.error && (
        <span style={{ color: "var(--danger)", fontSize: 12, width: "100%" }}>{state.error}</span>
      )}
    </form>
  );
}
