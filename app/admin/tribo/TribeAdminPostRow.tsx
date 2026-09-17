"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adminDeleteTribePostAction,
  adminHideTribePostAction,
  adminListTribeCommentsAction,
  adminUnhideTribePostAction,
} from "./actions";
import { TribeAdminCommentRow, type TribeAdminCommentRowData } from "./TribeAdminCommentRow";

export type TribeAdminPostData = {
  id: string;
  schoolId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  status: string;
  createdAt: string;
  hiddenAt: string | null;
  hiddenByUserId: string | null;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Ativa", color: "var(--success)" },
  HIDDEN: { label: "Oculta", color: "var(--warning)" },
  DELETED: { label: "Apagada", color: "var(--danger)" },
};

export function TribeAdminPostRow({
  post,
  authorName,
  hiddenByName,
  schoolName,
  media,
  likeCount,
  commentCount,
  userMap,
}: {
  post: TribeAdminPostData;
  authorName: string;
  hiddenByName: string | null;
  schoolName: string;
  media: { id: string; publicUrl: string; mimeType: string }[];
  likeCount: number;
  commentCount: number;
  userMap: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<TribeAdminCommentRowData[] | null>(null);

  function refresh() {
    router.refresh();
  }

  function runAction(action: (postId: string) => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action(post.id);
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  async function toggleComments() {
    if (!commentsOpen) {
      setCommentsOpen(true);
      if (comments === null) {
        const r = await adminListTribeCommentsAction(post.id);
        setComments(r.comments ?? []);
      }
    } else {
      setCommentsOpen(false);
    }
  }

  const statusInfo = STATUS_LABEL[post.status] ?? { label: post.status, color: "var(--text-secondary)" };

  return (
    <li className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{authorName}</span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>· {schoolName}</span>
        <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: "var(--radius-md)", backgroundColor: statusInfo.color, color: "#fff" }}>
          {statusInfo.label}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {post.visibility === "ALL_SCHOOLS" ? "Todas as escolas" : "Só a minha escola"}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 15, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>{post.body}</p>

      {media.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {media.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={m.id}
              src={m.publicUrl}
              alt=""
              style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "var(--radius-md)" }}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--text-secondary)" }}>
        <span>👊 {likeCount}</span>
        <button
          type="button"
          onClick={toggleComments}
          style={{ background: "none", border: "none", padding: 0, color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}
        >
          💬 {commentCount} {commentsOpen ? "▲" : "▼"}
        </button>
        <span>{new Date(post.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>

      {post.hiddenByUserId && post.hiddenAt && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
          {post.status === "DELETED" ? "Apagado" : "Ocultado"} por {hiddenByName ?? post.hiddenByUserId} em{" "}
          {new Date(post.hiddenAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {post.status === "ACTIVE" && (
          <button type="button" disabled={pending} onClick={() => runAction(adminHideTribePostAction)} className="btn" style={{ fontSize: 13 }}>
            Ocultar
          </button>
        )}
        {post.status === "HIDDEN" && (
          <button type="button" disabled={pending} onClick={() => runAction(adminUnhideTribePostAction)} className="btn" style={{ fontSize: 13 }}>
            Repor
          </button>
        )}
        {post.status !== "DELETED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Apagar esta publicação permanentemente?")) runAction(adminDeleteTribePostAction);
            }}
            className="btn"
            style={{ fontSize: 13, backgroundColor: "var(--danger)", color: "#fff" }}
          >
            Apagar
          </button>
        )}
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{error}</p>}

      {commentsOpen && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {comments === null ? (
            <li style={{ fontSize: 13, color: "var(--text-secondary)" }}>A carregar…</li>
          ) : comments.length === 0 ? (
            <li style={{ fontSize: 13, color: "var(--text-secondary)" }}>Sem comentários.</li>
          ) : (
            comments.map((c) => (
              <TribeAdminCommentRow
                key={c.id}
                comment={c}
                authorName={userMap[c.authorUserId] ?? c.authorUserId}
                onChanged={async () => {
                  const r = await adminListTribeCommentsAction(post.id);
                  setComments(r.comments ?? []);
                  refresh();
                }}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}
