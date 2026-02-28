"use client";

import { useFormState } from "react-dom";
import { createComment, type CreateCommentResult } from "../actions";

type CommentRow = { id: string; content: string; createdAt: string; authorName: string };

function formatCommentDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type Props = {
  athleteId: string;
  comments: CommentRow[];
  canAdd: boolean;
};

export function ComentariosAtleta({ athleteId, comments, canAdd }: Props) {
  const [state, formAction] = useFormState(createComment, null as CreateCommentResult | null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)" }}>
      {canAdd && (
        <form
          action={formAction}
          className="card"
          style={{
            padding: "clamp(16px, 4vw, 20px)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(12px, 3vw, 16px)",
          }}
        >
          <input type="hidden" name="targetId" value={athleteId} />
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
              Novo comentário
            </span>
            <textarea
              name="content"
              required
              rows={3}
              className="input"
              placeholder="Notas sobre o atleta..."
              style={{ resize: "vertical", minHeight: "clamp(72px, 18vw, 88px)" }}
            />
          </label>
          {state?.error && (
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--danger)" }}>
              {state.error}
            </p>
          )}
          <button type="submit" className="btn btn-primary">
            Adicionar
          </button>
        </form>
      )}

      {comments.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
          Nenhum comentário ainda.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {comments.map((c) => (
            <li key={c.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
              <p style={{ margin: "0 0 6px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                {c.content}
              </p>
              <p style={{ margin: 0, fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                {c.authorName} · {formatCommentDate(c.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
